import type { SandboxRequest } from '../protocol.ts'
import { randomUUID } from 'node:crypto'
import { copyFile, readFile, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'

const engines = {
  eslint: () => import('./eslint.ts'),
  stylelint: () => import('./stylelint.ts'),
  markdownlint: () => import('./markdownlint.ts'),
}
const mode = process.argv[2] as SandboxRequest['mode']
if (mode === 'eslint') {
  const require = createRequire(import.meta.resolve('@zzjtnb/eslint-config'))
  // 在原包目录保留模块解析上下文，只添加构建生成的资源，不改写第三方源文件。
  await copyFile(resolve('config-bundle.cjs'), join(dirname(require.resolve('@antfu/eslint-config')), 'playground.cjs'))
}
const engine = engines[mode]()

/** 检查沙箱工作区相对路径，禁止越界与换行。 */
function validPath(filename: string) {
  return !!filename && !filename.startsWith('/') && !filename.split(/[\\/]/).includes('..') && !/[\0\r\n]/.test(filename)
}

/** 将单文件引擎结果转换为工作区结果，保留首个文件的已测耗时。 */
function workspaceEntry(filename: string, item: Awaited<ReturnType<Awaited<typeof engine>['execute']>>, result: typeof item, fileStart: number) {
  return {
    filename,
    ignored: item.ignored,
    rules: item.rules,
    matchedConfigs: item.matchedConfigs,
    messages: item.messages,
    duration: item === result
      ? result.duration
      : performance.now() - fileStart,
    performance: item.performance,
    timings: item.timings,
  }
}

/** 对实际工作区逐文件检查并记录引擎结果与耗时。 */
async function inspectWorkspace(
  request: SandboxRequest,
  loaded: Awaited<typeof engine>,
  configURL: string,
  result: Awaited<ReturnType<Awaited<typeof engine>['execute']>>,
  extensions: Record<SandboxRequest['mode'], RegExp>,
) {
  if (request.action !== 'stats' && request.action !== 'files')
    return
  if (!request.files)
    return
  result.workspace = []
  for (const [filename, source] of Object.entries(request.files)) {
    if (!validPath(filename))
      throw new Error('工作区含有非法文件路径')
    if (!extensions[request.mode].test(filename))
      continue
    const fileStart = performance.now()
    const item = filename === request.filename && source === request.source
      ? result
      : await loaded.execute({
          ...request,
          filename,
          source,
          action: request.action === 'files'
            ? 'inspect'
            : 'stats',
        }, configURL)
    result.workspace.push(workspaceEntry(filename, item, result, fileStart))
  }
}

async function execute(request: SandboxRequest) {
  const filename = resolve(`config-${randomUUID()}.mjs`)
  try {
    if (!['eslint', 'stylelint', 'markdownlint'].includes(request.mode))
      throw new Error('不支持的检查工具')
    if (!validPath(request.filename))
      throw new Error('文件名必须是工作区内的相对路径')
    const extensions = { eslint: /\.(?:[cm]?[jt]sx?|vue|json[5c]?|ya?ml|toml)$/, stylelint: /\.(?:css|scss|vue|html?)$/, markdownlint: /\.md$/ }
    if (!extensions[request.mode].test(request.filename))
      throw new Error('当前工具不支持此文件类型')
    await writeFile(filename, request.config)
    const start = performance.now()
    const loaded = await engine
    const configURL = `${pathToFileURL(filename).href}?v=${Date.now()}`
    const result = await loaded.execute(request, configURL)
    result.duration = performance.now() - start
    await inspectWorkspace(request, loaded, configURL, result, extensions)
    result.duration = performance.now() - start
    return { result }
  }
  catch (error) {
    return {
      error: error instanceof Error
        ? error.stack ?? error.message
        : String(error),
    }
  }
  finally {
    await unlink(filename).catch((error) => {
      if (error.code !== 'ENOENT')
        throw error
    })
  }
}

// 与官方演示一样，服务常驻并用标准输入输出传递请求；配置模块每次重新执行。
process.stdin.setRawMode(true)
const commands = createInterface({ input: process.stdin, terminal: false })
commands.on('line', async (line) => {
  const { id, request } = JSON.parse(line) as { id: string, request: SandboxRequest }
  process.stdout.write(`PLAYGROUND_RESULT:${JSON.stringify({
    id,
    ...await execute(request),
  })}\n`)
})
// 首次加载完整共享配置与插件，再解析当前文件，不执行示例检查或自动修复。
void engine.then(async (loaded) => {
  const requests = JSON.parse(await readFile('warmup.json', 'utf8')) as SandboxRequest[]
  const extension = process.argv[3]?.split('.').pop()
  const request = requests.find(item => item.filename.split('.').pop() === extension) ?? requests[0]!
  process.stdout.write(`PLAYGROUND_WARMING:${request.filename}\n`)
  const start = performance.now()
  const url = pathToFileURL(resolve('warmup-config.mjs')).href
  await loaded.execute({ ...request, action: 'inspect' }, url)
  process.stdout.write(`当前文件类型准备完成 · ${(performance.now() - start).toFixed(0)} ms\n`)
  process.stdout.write('PLAYGROUND_READY\n')
})
