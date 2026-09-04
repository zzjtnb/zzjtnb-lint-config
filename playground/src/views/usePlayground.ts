import type { LintResult, PlaygroundMode, ToolMetadata, WorkspaceView } from '../../types'

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

import { configurations } from '../data/configs'

const STORAGE_KEY = 'zzjtnb-lint-config-playground'

interface PersistedState {
  dark?: boolean
  mode?: PlaygroundMode
  query?: string
  rawConfigs?: Partial<Record<PlaygroundMode, string>>
  view?: WorkspaceView
  drafts?: Record<string, string>
  filenames?: Partial<Record<PlaygroundMode, string>>
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

const modes = Object.keys(configurations) as PlaygroundMode[]

function isPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return false
  const state = value as Record<string, unknown>
  if (state.mode !== undefined && (typeof state.mode !== 'string' || !Object.hasOwn(configurations, state.mode)))
    return false
  if (state.query !== undefined && typeof state.query !== 'string')
    return false
  if (state.dark !== undefined && typeof state.dark !== 'boolean')
    return false
  if (state.view !== undefined && (typeof state.view !== 'string' || !['code', 'config', 'rules'].includes(state.view)))
    return false
  for (const name of ['rawConfigs', 'drafts', 'filenames']) {
    const entries = state[name]
    if (entries !== undefined && (!entries || typeof entries !== 'object' || Array.isArray(entries) || Object.values(entries).some(value => typeof value !== 'string')))
      return false
  }
  const filenames = state.filenames as PersistedState['filenames']
  return modes.every(mode => filenames?.[mode] === undefined || configurations[mode].examples.some(example => example.filename === filenames[mode]))
}

function readState(): PersistedState {
  const encoded = window.location.hash.slice(1)
  const state: unknown = JSON.parse(encoded
    ? decode(encoded)
    : localStorage.getItem(STORAGE_KEY) ?? '{}')
  if (!isPersistedState(state))
    throw new Error('保存的 Playground 状态格式无效')
  return state
}

/**
 * 管理工作台草稿、检查请求、规则读取和分享；浏览器资源随所属页面释放。
 * @returns 响应式视图状态及操作，错误保留当前草稿并供界面反馈。
 */
export function usePlayground() {
  const mode = ref<PlaygroundMode>('eslint')
  const view = ref<WorkspaceView>('code')
  const query = ref('')
  const ruleFilter = ref<'all' | 'enabled' | 'off'>('all')
  const selectedRuleName = ref('')
  const dark = ref(false)
  const copied = ref(false)
  const sharing = ref(false)
  const copiedTarget = ref('')
  const shareError = ref('')
  const stateError = ref('')
  const meta = ref<ToolMetadata>()
  const metaLoading = ref(false)
  const metaError = ref('')
  const result = ref<LintResult>()
  const running = ref(false)
  const runError = ref('')
  const fixed = ref(false)
  const lastSource = ref('')
  const rawConfigs = reactive(Object.fromEntries(modes.map(mode => [mode, configurations[mode].config])) as Record<PlaygroundMode, string>)
  const filenames = reactive(Object.fromEntries(modes.map(mode => [mode, configurations[mode].examples[0]!.filename])) as Record<PlaygroundMode, string>)
  const drafts = reactive(Object.fromEntries(modes.flatMap(mode => configurations[mode].examples.map(example => [`${mode}/${example.filename}`, example.code]))))
  let disposed = false
  let mounted = false
  let previousSnapshot = ''
  let shareId = 0
  let runId = 0
  let metaId = 0
  let metaTarget = ''
  let copiedTimer: ReturnType<typeof setTimeout> | undefined
  let metaController: AbortController | undefined
  let runController: AbortController | undefined

  const activeConfig = computed(() => configurations[mode.value])
  const filename = computed(() => filenames[mode.value])
  const source = computed({
    get: () => drafts[`${mode.value}/${filename.value}`] ?? '',
    set: (value: string) => { drafts[`${mode.value}/${filename.value}`] = value },
  })
  const rules = computed(() => meta.value?.rules ?? [])
  const filteredRules = computed(() => {
    const needle = query.value.trim().toLowerCase()
    return rules.value.filter(rule => (ruleFilter.value === 'all' || (rule.status === 'off'
      ? 'off'
      : 'enabled') === ruleFilter.value)
    && (!needle || `${rule.name} ${rule.description} ${rule.category}`.toLowerCase().includes(needle)))
  })
  const selectedRule = computed(() => filteredRules.value.find(rule => rule.name === selectedRuleName.value) ?? filteredRules.value[0])
  const stale = computed(() => !!result.value && (result.value.mode !== mode.value || result.value.filename !== filename.value || source.value !== lastSource.value))
  const errors = computed(() => result.value?.diagnostics.filter(item => item.severity === 'error').length ?? 0)
  const warnings = computed(() => result.value?.diagnostics.filter(item => item.severity === 'warning').length ?? 0)

  function snapshot(): PersistedState {
    return {
      dark: dark.value,
      mode: mode.value,
      view: view.value,
      query: query.value,
      rawConfigs: { ...rawConfigs },
      filenames: { ...filenames },
      drafts: { ...drafts },
    }
  }

  function clearShare() {
    shareId++
    copied.value = false
    copiedTarget.value = ''
    shareError.value = ''
    clearTimeout(copiedTimer)
    copiedTimer = undefined
  }

  async function copyText(text: string, target: string) {
    if (sharing.value || disposed)
      return
    clearShare()
    const id = shareId
    sharing.value = true
    try {
      if (!navigator.clipboard?.writeText) {
        shareError.value = target === 'share'
          ? '浏览器不支持自动复制，请复制地址栏中的分享链接。'
          : '浏览器不支持自动复制，请选中文本手动复制。'
        return
      }
      await navigator.clipboard.writeText(text)
      if (disposed || id !== shareId)
        return
      copied.value = target === 'share'
      copiedTarget.value = target
      copiedTimer = setTimeout(() => {
        copied.value = false
        copiedTarget.value = ''
        copiedTimer = undefined
      }, 1600)
    }
    catch {
      if (!disposed && id === shareId)
        shareError.value = target === 'share'
          ? '分享失败，可手动复制地址栏中的链接。'
          : '复制失败，请选中文本手动复制。'
    }
    finally {
      if (!disposed)
        sharing.value = false
    }
  }

  async function share() {
    if (sharing.value || disposed)
      return
    try {
      const url = new URL(window.location.href)
      url.hash = encodeURIComponent(JSON.stringify(snapshot()))
      window.history.replaceState(window.history.state, '', url)
      await copyText(url.toString(), 'share')
    }
    catch {
      shareError.value = '无法生成分享链接，当前编辑已保留，请重试。'
    }
  }

  async function request<T>(url: string, options: RequestInit, signal: AbortSignal): Promise<T> {
    let response: Response
    try {
      response = await fetch(url, { ...options, signal })
    }
    catch (error) {
      if (signal.aborted)
        throw error
      throw new Error('本地运行器未连接，请在仓库根启动 pnpm --filter @zzjtnb/playground dev。')
    }
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw new Error('当前页面没有本地运行器，请在仓库根启动 pnpm --filter @zzjtnb/playground dev。')
    const data = await response.json()
    if (!response.ok)
      throw new Error(data.error ?? '本地运行器未能完成请求。')
    return data as T
  }

  async function loadMetadata(force = false) {
    const target = `${mode.value}/${filename.value}`
    if (!force && metaTarget === target)
      return
    metaController?.abort()
    const controller = new AbortController()
    metaController = controller
    const id = ++metaId
    if (metaTarget !== target)
      meta.value = undefined
    metaTarget = target
    metaLoading.value = true
    metaError.value = ''
    try {
      const params = new URLSearchParams({ mode: mode.value, filename: filename.value })
      const data = await request<ToolMetadata>(`/api/playground/meta?${params}`, {}, controller.signal)
      if (!disposed && id === metaId)
        meta.value = data
    }
    catch (error) {
      if (!disposed && id === metaId && !controller.signal.aborted) {
        metaError.value = error instanceof Error
          ? error.message
          : '规则读取失败，请重试。'
        metaTarget = ''
      }
    }
    finally {
      if (!disposed && id === metaId)
        metaLoading.value = false
    }
  }

  function cancelRun() {
    runId++
    runController?.abort()
    running.value = false
  }

  async function run(fix = false) {
    if (running.value || disposed)
      return
    const controller = new AbortController()
    runController = controller
    const id = ++runId
    const input = {
      mode: mode.value,
      filename: filename.value,
      code: source.value,
      fix,
    }
    running.value = true
    runError.value = ''
    fixed.value = false
    try {
      const data = await request<LintResult>('/api/playground/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }, controller.signal)
      if (disposed || id !== runId)
        return
      if (fix)
        drafts[`${input.mode}/${input.filename}`] = data.output
      lastSource.value = fix ? data.output : input.code
      fixed.value = fix && data.output !== input.code
      result.value = data
    }
    catch (error) {
      if (!disposed && id === runId && !controller.signal.aborted)
        runError.value = error instanceof Error
          ? error.message
          : '检查失败，请重试。'
    }
    finally {
      if (!disposed && id === runId)
        running.value = false
    }
  }

  function selectMode(nextMode: PlaygroundMode) {
    clearShare()
    cancelRun()
    mode.value = nextMode
    query.value = ''
    ruleFilter.value = 'all'
    selectedRuleName.value = ''
    result.value = undefined
    runError.value = ''
  }

  function selectFile(value: string) {
    filenames[mode.value] = value
    cancelRun()
    result.value = undefined
    runError.value = ''
  }

  function selectRule(name: string) {
    selectedRuleName.value = name
  }

  function reset() {
    clearShare()
    cancelRun()
    if (view.value === 'config')
      rawConfigs[mode.value] = activeConfig.value.config
    else
      source.value = activeConfig.value.examples.find(example => example.filename === filename.value)!.code
    result.value = undefined
    runError.value = ''
  }

  onMounted(() => {
    try {
      const state = readState()
      if (state.mode !== undefined)
        mode.value = state.mode
      if (state.view !== undefined)
        view.value = state.view
      if (state.query !== undefined)
        query.value = state.query
      if (state.dark !== undefined)
        dark.value = state.dark
      for (const current of modes) {
        if (state.rawConfigs?.[current] !== undefined)
          rawConfigs[current] = state.rawConfigs[current]
        if (state.filenames?.[current] !== undefined)
          filenames[current] = state.filenames[current]
      }
      for (const key of Object.keys(drafts)) {
        if (state.drafts?.[key] !== undefined)
          drafts[key] = state.drafts[key]
      }
    }
    catch {
      stateError.value = '无法恢复保存的内容，请检查分享链接或浏览器存储。'
    }
    // 恢复产生的响应式变化不是用户编辑，不能因此废弃刚打开的分享链接。
    previousSnapshot = JSON.stringify(snapshot())
    mounted = true
    void loadMetadata()
  })

  watch([mode, filename], () => {
    if (mounted)
      void loadMetadata()
  })
  watch(source, () => {
    if (running.value)
      cancelRun()
  })
  watch([
    mode,
    view,
    query,
    dark,
    rawConfigs,
    filenames,
    drafts,
  ], () => {
    const state = JSON.stringify(snapshot())
    if (state === previousSnapshot)
      return
    clearShare()
    try {
      localStorage.setItem(STORAGE_KEY, state)
      // 分享链接是固定快照。编辑保存后移除旧 hash，否则刷新会优先加载旧快照、覆盖新草稿。
      if (window.location.hash) {
        const url = new URL(window.location.href)
        url.hash = ''
        window.history.replaceState(window.history.state, '', url)
      }
      previousSnapshot = state
      stateError.value = ''
    }
    catch {
      stateError.value = '无法保存本地记录，当前编辑仍然有效，请通过分享链接保留内容。'
    }
  }, { deep: true })

  onUnmounted(() => {
    disposed = true
    clearShare()
    cancelRun()
    metaController?.abort()
  })

  return {
    mode,
    view,
    modes,
    query,
    ruleFilter,
    dark,
    activeConfig,
    filename,
    filenames,
    source,
    rawConfigs,
    rules,
    filteredRules,
    selectedRule,
    selectRule,
    meta,
    metaLoading,
    metaError,
    loadMetadata,
    result,
    running,
    runError,
    stale,
    errors,
    warnings,
    fixed,
    run,
    cancelRun,
    copied,
    copiedTarget,
    sharing,
    shareError,
    stateError,
    copyText,
    share,
    reset,
    selectMode,
    selectFile,
  }
}
