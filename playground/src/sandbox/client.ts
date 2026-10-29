/** 单个 WebContainer 内按工具持有独立服务、依赖及请求生命周期。 */
import type { WebContainer, WebContainerProcess } from '@webcontainer/api'
import type { SandboxRequest, SandboxResult } from '../../protocol'
import { shallowReactive, shallowRef } from 'vue'

type Mode = SandboxRequest['mode']
/** 阶段用于界面语义，消息保留具体进度；两者由实际操作同时更新。 */
export interface RuntimeState {
  phase: 'idle' | 'preparing' | 'installed' | 'ready' | 'running' | 'cancelled' | 'error'
  message: string
}
export const runtimeStates = shallowReactive<Record<Mode, RuntimeState>>({
  eslint: { phase: 'idle', message: '尚未初始化' },
  stylelint: { phase: 'idle', message: '尚未初始化' },
  markdownlint: { phase: 'idle', message: '尚未初始化' },
})
export const runtimeLog = shallowRef('')
/** 清空控制台日志，不改变服务或检查结果。 */
export function clearLog() {
  runtimeLog.value = ''
}
let instance: WebContainer | undefined
let booting: Promise<WebContainer> | undefined
const runners = new Map<Mode, WebContainerProcess>()
const starting = new Map<Mode, Promise<void>>()
const writers = new Map<Mode, WritableStreamDefaultWriter<string>>()
let pending: { id: string, mode: Mode, resolve: (result: SandboxResult) => void, reject: (error: Error) => void } | undefined

/** 启动唯一运行时；依赖与 Linter 在其工作线程运行，不占用页面线程。 */
export async function getSandbox() {
  if (!crossOriginIsolated)
    throw new Error('浏览器未启用跨源隔离，请检查 COOP/COEP 响应头并使用支持的浏览器')
  if (instance)
    return instance
  booting ??= (async () => {
    runtimeLog.value += '启动 WebContainer…\n'
    const { WebContainer } = await import('@webcontainer/api')
    return WebContainer.boot()
  })().catch((error) => {
    booting = undefined
    throw error
  })
  instance = await booting
  return instance
}

/** 启动指定工具的常驻服务，等待引擎导入与就绪握手。 */
export function startRunner(mode: Mode, filename?: string, signal?: AbortSignal) {
  if (starting.has(mode))
    return starting.get(mode)!
  const ready = (async () => {
    runtimeStates[mode] = { phase: 'preparing', message: `启动 ${mode} 检查服务…` }
    runtimeLog.value += `[${mode}] 启动检查服务…\n`
    const args = ['runner/index.mjs', mode]
    if (filename)
      args.push(filename)
    const process = await (await getSandbox()).spawn('node', args, { cwd: mode })
    if (signal?.aborted) {
      process.kill()
      signal.throwIfAborted()
    }
    runners.set(mode, process)
    writers.set(mode, process.input.getWriter())
    let cancel: () => void
    try {
      await new Promise<void>((resolve, reject) => {
        cancel = () => {
          runners.delete(mode)
          starting.delete(mode)
          writers.delete(mode)
          process.kill()
          reject(signal!.reason)
        }
        signal?.addEventListener('abort', cancel, { once: true })
        let buffer = ''
        void process.output.pipeTo(new WritableStream({
          write(chunk) {
            if (signal?.aborted)
              return
            buffer += chunk
            let newline = buffer.indexOf('\n')
            while (newline !== -1) {
              const line = buffer.slice(0, newline).trim()
              buffer = buffer.slice(newline + 1)
              if (line.startsWith('PLAYGROUND_WARMING:')) {
                const file = line.slice('PLAYGROUND_WARMING:'.length)
                runtimeStates[mode] = { phase: 'preparing', message: `准备 ${mode} ${file} 文件类型…` }
                runtimeLog.value += `[${mode}] 加载完整共享配置与插件，解析 ${file}；不预执行源码检查或修复\n`
              }
              else if (line === 'PLAYGROUND_READY') {
                runtimeStates[mode] = { phase: 'ready', message: '浏览器引擎已就绪' }
                runtimeLog.value += `[${mode}] 检查服务已就绪\n`
                resolve()
              }
              else if (line.startsWith('PLAYGROUND_RESULT:')) {
                const response = JSON.parse(line.slice('PLAYGROUND_RESULT:'.length)) as { id: string, result?: SandboxResult, error?: string }
                if (response.id === pending?.id) {
                  if (response.error || !response.result)
                    pending.reject(new Error(response.error ?? '检查服务没有返回结果'))
                  else pending.resolve(response.result)
                }
              }
              else {
                runtimeLog.value += `[${mode}] ${line}\n`
              }
              newline = buffer.indexOf('\n')
            }
          },
        })).catch((error: Error) => {
          reject(error)
          if (pending?.mode === mode)
            pending.reject(error)
        })
        void process.exit.then((code) => {
          if (runners.get(mode) !== process)
            return
          runners.delete(mode)
          starting.delete(mode)
          writers.delete(mode)
          const error = new Error(`${mode} 检查服务已退出（${code}）\n${runtimeLog.value}`)
          runtimeStates[mode] = { phase: 'error', message: `${mode} 检查服务已退出，运行检查可重试` }
          reject(error)
          if (pending?.mode === mode)
            pending.reject(error)
        })
      })
    }
    finally { signal?.removeEventListener('abort', cancel!) }
  })().catch((error) => {
    starting.delete(mode)
    throw error
  })
  starting.set(mode, ready)
  return ready
}

/** 检查真实输入；准备、取消和超时仅作用于所属工具。 */
export async function runSandbox(request: SandboxRequest, signal?: AbortSignal): Promise<SandboxResult> {
  const { prepareRuntime } = await import('./assets')
  signal?.throwIfAborted()
  let abort: (() => void) | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const interrupted = new Promise<never>((_, reject) => {
      abort = () => reject(signal?.reason ?? new Error('操作已取消'))
      signal?.addEventListener('abort', abort, { once: true })
    })
    await Promise.race([
      prepareRuntime(request.mode, request.filename),
      interrupted,
    ])
    await Promise.race([
      startRunner(request.mode, request.filename),
      interrupted,
    ])
    signal?.throwIfAborted()
    const process = runners.get(request.mode)!
    if (abort)
      signal?.removeEventListener('abort', abort)
    abort = () => {
      runners.delete(request.mode)
      starting.delete(request.mode)
      writers.delete(request.mode)
      process.kill()
      runtimeStates[request.mode] = { phase: 'cancelled', message: '检查已取消，下次运行重新启动服务' }
      pending?.reject(signal?.reason ?? new Error('操作已取消'))
    }
    const id = crypto.randomUUID()
    const result = new Promise<SandboxResult>((resolve, reject) => {
      pending = {
        id,
        mode: request.mode,
        resolve,
        reject,
      }
      timer = setTimeout(() => {
        runners.delete(request.mode)
        starting.delete(request.mode)
        writers.delete(request.mode)
        process.kill()
        runtimeStates[request.mode] = { phase: 'error', message: '执行超时，下次运行重新启动服务' }
        reject(new Error('执行超过 60 秒，检查服务已终止；配置与输入已保留'))
      }, 60000)
    })
    signal?.addEventListener('abort', abort, { once: true })
    runtimeLog.value += `执行 ${request.mode} ${request.action} · ${request.filename}\n`
    runtimeStates[request.mode] = { phase: 'running', message: `正在${request.action === 'fix'
      ? '预览修复'
      : request.action === 'stats'
        ? '分析性能'
        : request.action === 'files' || request.action === 'inspect'
          ? '解析配置'
          : '检查代码'}…` }
    await writers.get(request.mode)!.write(`${JSON.stringify({ id, request })}\n`)
    const response = await Promise.race([result, interrupted])
    runtimeLog.value += `完成 · ${response.duration.toFixed(0)} ms · ${response.messages.length} 条诊断\n`
    runtimeStates[request.mode] = { phase: 'ready', message: '浏览器引擎已就绪' }
    return response
  }
  catch (error) {
    if (runtimeStates[request.mode].phase !== 'cancelled' && runtimeStates[request.mode].phase !== 'error')
      runtimeStates[request.mode] = { phase: 'error', message: '检查失败，可修改输入后重试' }
    runtimeLog.value += `执行失败：${String(error)}\n`
    throw error
  }
  finally {
    pending = undefined
    clearTimeout(timer)
    if (abort)
      signal?.removeEventListener('abort', abort)
  }
}

/** 停止当前工具进程并释放输入通道，保留沙箱文件系统与页面草稿。 */
export async function stopRunner(mode: Mode) {
  const process = runners.get(mode)
  runners.delete(mode)
  starting.delete(mode)
  writers.delete(mode)
  process?.kill()
  if (process)
    await process.exit
}

/** 仅重启当前工具进程，复用依赖，保留编辑内容。 */
export async function restartRuntime(mode: Mode, filename?: string) {
  await stopRunner(mode)
  runtimeStates[mode] = { phase: 'preparing', message: '重启检查服务…' }
  const { prepareRuntime } = await import('./assets')
  await prepareRuntime(mode, filename)
  await startRunner(mode, filename)
  runtimeStates[mode] = { phase: 'ready', message: '浏览器引擎已就绪' }
}
