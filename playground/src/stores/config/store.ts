import type { SandboxResult } from '../../../protocol'
import type { PlaygroundMode, RuleItem, ToolMetadata } from '../../../types'
import type { ConfigDraft, RuleConverters, RuleLevel } from './types'
import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { configurations, defaults } from './catalog'
import { changeLevel as eslintLevel } from './editing/eslint'
import { changeLevel as markdownlintLevel } from './editing/markdownlint'
import { factoryOptions, setFactoryOption } from './editing/options'
import { exportConfig } from './editing/source'
import { changeLevel as stylelintLevel } from './editing/stylelint'

export const useConfigStore = defineStore('config', () => {
  const mode = ref<PlaygroundMode>('eslint')
  const drafts = reactive(Object.fromEntries((Object.keys(configurations) as PlaygroundMode[]).map(key => [
    key,
    {
      code: defaults(key),
      overrides: {} as Record<string, unknown>,
      filename: configurations[key].targets[0]!.filename,
    },
  ])) as Record<PlaygroundMode, ConfigDraft>)
  const active = computed(() => configurations[mode.value])
  const draft = computed(() => drafts[mode.value])
  // 引擎与发布元数据整体替换，不追踪只读大对象的每个嵌套字段。
  const metadata = shallowRef<ToolMetadata>()
  const catalogs = shallowRef<Partial<Record<PlaygroundMode, RuleItem[]>>>({})
  const catalog = computed(() => catalogs.value[mode.value] ?? metadata.value?.rules ?? [])
  const resolved = shallowRef<SandboxResult>()
  const resolvedIdentity = ref('')
  const loading = ref(false)
  const error = ref('')
  const selectedRule = ref('')
  const selectedConfig = ref<number>()
  const feedback = ref('')
  const identity = computed(() => JSON.stringify([
    mode.value,
    draft.value.code,
    draft.value.overrides,
    draft.value.filename,
  ]))
  const original = computed(() => defaults(mode.value))
  const options = computed(() => factoryOptions(draft.value.code, mode.value))
  const changeCount = computed(() => Object.keys(draft.value.overrides).length + Number(draft.value.code !== original.value))
  const edited = computed(() => draft.value.code !== original.value || Object.keys(draft.value.overrides).length > 0)
  const converters: RuleConverters = { eslint: eslintLevel, stylelint: stylelintLevel, markdownlint: markdownlintLevel }
  function setOption(key: string, enabled: boolean) {
    draft.value.code = setFactoryOption(draft.value.code, key, enabled)
  }
  function changeLevel(name: string, value: unknown, level: RuleLevel) {
    setOverride(name, converters[mode.value](value, level))
  }
  const resolvedCurrent = computed(() => resolved.value && resolvedIdentity.value === identity.value)
  const rules = computed<RuleItem[]>(() => {
    const values = resolvedCurrent.value ? resolved.value!.rules : undefined
    // 完整定义与当前文件的配置值分开读取，未配置规则也保留在目录。
    const definitions = new Map(catalog.value.map(rule => [
      rule.name,
      {
        ...rule,
        files: draft.value.filename,
        configured: false,
        status: 'off' as const,
        value: 'null',
      } as RuleItem,
    ]))
    for (const rule of metadata.value?.rules ?? []) definitions.set(rule.name, rule)
    for (const name of Object.keys(values ?? {})) {
      if (!definitions.has(name)) {
        definitions.set(name, {
          name,
          category: name.includes('/')
            ? name.slice(0, name.lastIndexOf('/'))
            : mode.value,
          description: '',
          files: draft.value.filename,
          configured: false,
          status: 'off',
          value: 'null',
          sources: [],
        })
      }
    }
    return [
      ...definitions.values(),
    ].map((rule) => {
      if (!values)
        return rule
      const configured = Object.hasOwn(values, rule.name)
      const value = values[rule.name]
      const primary = Array.isArray(value)
        ? value[0]
        : value
      const secondary = Array.isArray(value)
        ? value[1]
        : undefined
      const status = mode.value === 'stylelint'
        ? primary == null || primary === false
          ? 'off'
          : secondary?.severity === 'warning'
            ? 'warn'
            : 'error'
        : primary === false || primary == null || primary === 0 || primary === 'off'
          ? 'off'
          : primary === 1 || primary === 'warn'
            ? 'warn'
            : 'error'
      return {
        ...rule,
        configured,
        status,
        value: JSON.stringify(value ?? null),
        sources: mode.value === 'eslint'
          ? resolved.value!.configs.filter(item => Object.hasOwn(item.rules, rule.name)).map(item => ({
              name: item.name,
              index: item.index,
              files: item.files,
              value: JSON.stringify(item.rules[rule.name]),
            }))
          : [],
      } as RuleItem
    })
  })
  const configs = computed(() => resolvedCurrent.value
    ? resolved.value!.configs
    : metadata.value?.configs ?? [])
  let controller: AbortController | undefined
  let requestId = 0
  async function load() {
    controller?.abort()
    const current = ++requestId
    controller = new AbortController()
    loading.value = true
    error.value = ''
    if (metadata.value?.mode !== mode.value)
      metadata.value = undefined
    try {
      const target = active.value.targets.find(target => target.filename === draft.value.filename) ?? active.value.targets[0]!
      const tool = mode.value
      const [response, definitions] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}metadata/${tool}/${target.filename}.json`, { signal: controller.signal }),
        catalogs.value[tool] ?? fetch(`${import.meta.env.BASE_URL}metadata/${tool}/catalog.json`, { signal: controller.signal }).then(async (response) => {
          if (!response.ok)
            throw new Error('完整规则目录读取失败，请重新生成站点数据')
          return ((await response.json()) as Pick<ToolMetadata, 'rules'>).rules
        }),
      ])
      if (!response.ok)
        throw new Error('规则目录读取失败，请重试或重新生成站点数据')
      const data = await response.json() as ToolMetadata
      if (current === requestId) {
        catalogs.value = { ...catalogs.value, [tool]: definitions }
        metadata.value = data
      }
    }
    catch (cause) {
      if (current === requestId && !controller?.signal.aborted) {
        error.value = String(cause instanceof Error
          ? cause.message
          : cause)
      }
    }
    finally {
      if (current === requestId)
        loading.value = false
    }
  }
  function selectMode(next: PlaygroundMode) {
    mode.value = next
    selectedRule.value = ''
    selectedConfig.value = undefined
  }
  function setResolved(result: SandboxResult, version: string) {
    resolved.value = result
    resolvedIdentity.value = version
  }
  function reset() {
    draft.value.code = defaults(mode.value)
    draft.value.overrides = {}
  }
  function setOverride(name: string, value: unknown) {
    draft.value.overrides[name] = value
  }
  function inherit(name: string) {
    delete draft.value.overrides[name]
  }
  const exported = computed(() => exportConfig(draft.value.code, draft.value.overrides, mode.value))
  const baseExported = computed(() => exportConfig(original.value, {}, mode.value))
  async function copy(text: string) {
    feedback.value = ''
    try {
      await navigator.clipboard.writeText(text)
      feedback.value = '已复制'
    }
    catch {
      feedback.value = '复制失败，请手动选择文本'
    }
  }
  function download(target: 'current' | 'default' = 'current') {
    try {
      const a = document.createElement('a')
      const url = URL.createObjectURL(new Blob([
        target === 'default'
          ? baseExported.value
          : exported.value,
      ], { type: 'text/javascript' }))
      a.href = url
      a.download = active.value.configFile
      a.click()
      URL.revokeObjectURL(url)
    }
    catch (cause) {
      feedback.value = String(cause)
    }
  }
  watch([
    mode,
    () => draft.value.filename,
  ], load)
  return {
    mode,
    drafts,
    draft,
    active,
    metadata,
    catalog,
    loading,
    error,
    rules,
    configs,
    selectedRule,
    selectedConfig,
    identity,
    resolved,
    resolvedCurrent,
    feedback,
    exported,
    baseExported,
    changeCount,
    original,
    options,
    edited,
    setOption,
    changeLevel,
    selectMode,
    load,
    setResolved,
    setOverride,
    inherit,
    reset,
    copy,
    download,
  }
})
