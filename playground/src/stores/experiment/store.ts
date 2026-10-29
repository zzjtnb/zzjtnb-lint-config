import type { PlaygroundMode } from '../../../types'
import type { Execution } from './types'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { runSandbox } from '../../sandbox/client'
import { configurations, useConfigStore } from '../config/index'
import { samples } from './samples'

export { samples } from './samples'

export const useExperimentStore = defineStore('experiment', () => {
  const config = useConfigStore()
  const sources = reactive<Record<string, string>>({})
  const imported = reactive<Record<string, string>>({})
  const importError = ref('')
  const supports = computed(() => config.mode === 'eslint'
    ? /\.(?:[cm]?[jt]sx?|vue|json[5c]?|ya?ml|toml)$/
    : config.mode === 'stylelint'
      ? /\.(?:css|scss|vue|html?)$/
      : /\.md$/)
  const sourceKey = computed(() => `${config.mode}/${config.draft.filename}`)
  const source = computed({
    get: () => sources[sourceKey.value] ?? imported[config.draft.filename] ?? samples[config.draft.filename.split('.').pop()!] ?? '',
    set: (value) => { sources[sourceKey.value] = value },
  })
  const workspace = computed<Record<string, string>>(() => {
    const files = Object.keys(imported).length
      ? Object.fromEntries(Object.entries(imported).map(([name, text]) => [name, sources[`${config.mode}/${name}`] ?? text]))
      : Object.fromEntries(config.active.targets.map(target => [target.filename, sources[`${config.mode}/${target.filename}`] ?? samples[target.filename.split('.').pop()!] ?? '']))
    if (!Object.keys(imported).length || Object.hasOwn(imported, config.draft.filename) || Object.hasOwn(sources, sourceKey.value))
      files[config.draft.filename] = source.value
    return files
  })
  function acceptsFile(filename: string) {
    return supports.value.test(filename)
  }
  const supportedFiles = computed(() => Object.fromEntries(Object.entries(workspace.value).filter(([name]) => acceptsFile(name))))
  const unsupportedFiles = computed(() => Object.keys(workspace.value).filter(name => !supports.value.test(name)))
  async function importFiles(files: Iterable<File> | null) {
    if (!files)
      return
    importError.value = ''
    try {
      for (const file of files) {
        const path = file.webkitRelativePath || file.name
        if (/\.(?:[cm]?[jt]sx?|vue|json[5c]?|ya?ml|toml|css|scss|html?|md)$/.test(path)) {
          const text = await file.text()
          // 重新选择同路径文件表示以磁盘原文重新导入，所有工具使用新的检查输入。
          for (const mode of ['eslint', 'stylelint', 'markdownlint']) delete sources[`${mode}/${path}`]
          imported[path] = text
        }
        else {
          imported[path] = ''
        }
      }
    }
    catch (cause) { importError.value = `导入未全部完成：${String(cause)}` }
  }
  function clearFiles() {
    for (const mode of Object.keys(configurations) as PlaygroundMode[]) {
      for (const path of Object.keys(imported)) delete sources[`${mode}/${path}`]
      if (Object.hasOwn(imported, config.drafts[mode].filename))
        config.drafts[mode].filename = configurations[mode].targets[0]!.filename
    }
    for (const key of Object.keys(imported)) delete imported[key]
    importError.value = ''
  }
  const results = reactive<Record<string, Execution>>({})
  const current = computed(() => results[sourceKey.value])
  const performanceRuns = reactive<Partial<Record<PlaygroundMode, Execution>>>({})
  const performanceRun = computed(() => performanceRuns[config.mode])
  const matchingRuns = reactive<Partial<Record<PlaygroundMode, Execution>>>({})
  const matchingRun = computed(() => matchingRuns[config.mode])
  const identity = computed(() => JSON.stringify([config.identity, source.value]))
  const workspaceIdentity = computed(() => JSON.stringify([
    config.mode,
    config.draft.code,
    config.draft.overrides,
    supportedFiles.value,
  ]))
  const matchingStale = computed(() => !!matchingRun.value && matchingRun.value.identity !== workspaceIdentity.value)
  const performanceStale = computed(() => !!performanceRun.value && performanceRun.value.identity !== workspaceIdentity.value)
  const stale = computed(() => !!current.value && current.value.identity !== identity.value)
  function selectFile(filename: string) {
    config.draft.filename = filename
    const file = matchingRun.value?.result.workspace?.find(file => file.filename === filename)
    if (file && !matchingStale.value) {
      config.setResolved({
        ...matchingRun.value!.result,
        rules: file.rules,
        ignored: file.ignored,
        matchedConfigs: file.matchedConfigs,
      }, config.identity)
    }
  }
  const preparations = reactive<Partial<Record<PlaygroundMode, boolean>>>({})
  const preparationErrors = reactive<Partial<Record<PlaygroundMode, string>>>({})
  const preparing = computed(() => preparations[config.mode] ?? false)
  const preparationError = computed(() => preparationErrors[config.mode] ?? '')
  /** 取消当前工具的准备，保留其他工具与草稿；再次准备显式复用现有依赖。 */
  async function cancelPrepare() {
    const { cancelPreparation } = await import('../../sandbox/assets')
    cancelPreparation(config.mode)
  }
  async function prepare() {
    const mode = config.mode
    const filename = config.draft.filename
    preparations[mode] = true
    preparationErrors[mode] = ''
    try {
      const { prepareRuntime, preinstallOthers } = await import('../../sandbox/assets')
      await prepareRuntime(mode, filename)
      void preinstallOthers(mode)
    }
    catch (cause) {
      preparationErrors[mode] = cause instanceof Error
        ? cause.message
        : String(cause)
    }
    finally {
      preparations[mode] = false
    }
  }
  /** 重装当前工具的运行依赖；准备状态由实验 Store 统一提供给页面操作。 */
  async function reinstall() {
    const mode = config.mode
    preparations[mode] = true
    preparationErrors[mode] = ''
    try {
      const { resetRuntime } = await import('../../sandbox/assets')
      await resetRuntime(mode, config.draft.filename)
    }
    catch (cause) {
      preparationErrors[mode] = String(cause instanceof Error
        ? cause.message
        : cause)
      throw cause
    }
    finally { preparations[mode] = false }
  }
  const running = ref(false)
  const operation = ref('')
  const failures = reactive<Record<string, string>>({})
  const error = computed(() => failures[identity.value] ?? failures[workspaceIdentity.value] ?? '')
  let controller: AbortController | undefined
  /** 将检查、修复、匹配与性能结果保存到各自所属状态。 */
  function saveExecution(action: Execution['action'] | 'inspect', execution: Omit<Execution, 'action'>, mode: PlaygroundMode) {
    if (action === 'inspect')
      return
    const completed: Execution = { ...execution, action }
    if (action === 'stats')
      performanceRuns[mode] = completed
    else if (action === 'files')
      matchingRuns[mode] = completed
    else results[`${mode}/${execution.filename}`] = completed
  }
  async function run(action: 'inspect' | 'check' | 'fix' | 'stats' | 'files') {
    if (running.value)
      return
    const batch = action === 'files' || action === 'stats'
    const currentIdentity = () => batch ? workspaceIdentity.value : identity.value
    const version = currentIdentity()
    const configVersion = config.identity
    const mode = config.mode
    const original = source.value
    const filename = config.draft.filename
    const pending = new AbortController()
    controller = pending
    running.value = true
    operation.value = action
    delete failures[version]
    try {
      const result = await runSandbox({
        mode,
        filename,
        config: config.draft.code,
        overrides: structuredClone(JSON.parse(JSON.stringify(config.draft.overrides))),
        source: original,
        action,
        files: ['files', 'stats'].includes(action)
          ? JSON.parse(JSON.stringify(supportedFiles.value))
          : undefined,
      }, pending.signal)
      if (version !== currentIdentity() || mode !== config.mode)
        return
      config.setResolved(result, configVersion)
      saveExecution(action, {
        filename,
        result,
        identity: version,
        original,
      }, mode)
    }
    catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError')
        return
      if (mode === config.mode && version === currentIdentity()) {
        failures[version] = cause instanceof Error
          ? cause.message
          : String(cause)
      }
    }
    finally {
      if (controller === pending) {
        running.value = false
        controller = undefined
      }
    }
  }
  function cancel() {
    controller?.abort(new Error('操作已取消'))
  }
  function reset() {
    delete sources[sourceKey.value]
  }
  /** 更换当前虚拟文件的路径，保留输入；同名文件与当前工具不支持的扩展名不覆盖。 */
  function renameFile(value: string) {
    const filename = value.trim()
    if (!filename || filename.startsWith('/') || filename.split(/[\\/]/).includes('..') || /[\0\r\n]/.test(filename))
      throw new Error('请输入工作区内的相对文件路径')
    if (!supports.value.test(filename))
      throw new Error('当前工具不支持此文件扩展名')
    if (filename === config.draft.filename)
      return
    if (Object.hasOwn(workspace.value, filename) || Object.hasOwn(sources, `${config.mode}/${filename}`))
      throw new Error('此文件已存在，请使用其他名称')
    const previous = config.draft.filename
    const text = source.value
    delete sources[sourceKey.value]
    if (Object.hasOwn(imported, previous)) {
      imported[filename] = imported[previous]!
      delete imported[previous]
      // 导入目录是三个工具共享的；路径迁移时保留各工具独立的编辑副本。
      for (const mode of Object.keys(configurations) as PlaygroundMode[]) {
        const key = `${mode}/${previous}`
        if (Object.hasOwn(sources, key)) {
          sources[`${mode}/${filename}`] = sources[key]!
          delete sources[key]
        }
        if (config.drafts[mode].filename === previous)
          config.drafts[mode].filename = filename
      }
    }
    config.draft.filename = filename
    sources[sourceKey.value] = text
  }
  function applyFix() {
    if (current.value && !stale.value && current.value.action === 'fix')
      source.value = current.value.result.output
  }
  return {
    preparing,
    preparationError,
    prepare,
    cancelPrepare,
    reinstall,
    source,
    imported,
    importError,
    workspace,
    supportedFiles,
    acceptsFile,
    unsupportedFiles,
    importFiles,
    clearFiles,
    selectFile,
    performanceRun,
    matchingRun,
    matchingStale,
    performanceStale,
    current,
    stale,
    running,
    operation,
    error,
    run,
    cancel,
    reset,
    renameFile,
    applyFix,
  }
})
