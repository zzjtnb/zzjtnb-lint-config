/** 清理指定 TCP 监听端口；默认只处理本项目端口，不扫描或终止全部 Node 进程。 */
import { execFile } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs, promisify } from 'node:util'
import { ports as projectPorts } from './config.ts'

const execute = promisify(execFile)

/** 解析命令行，在产生任何进程副作用前验证全部端口；显式端口替换项目默认值。 */
export function parsePorts(args) {
  const { values, positionals } = parseArgs({
    args,
    // 可用位置参数输入多个端口，也可重复使用 -p / --port。
    allowPositionals: true,
    options: {
      // 仅展示用法，不查询或终止进程。
      help: { type: 'boolean', short: 'h' },
      // 需要清理的 TCP 端口；可重复传入或使用逗号分隔。
      port: { type: 'string', short: 'p', multiple: true },
      // 对不响应正常终止的进程，显式选择立即终止。
      force: { type: 'boolean' },
    },
  })
  if (values.help)
    return { help: true }
  const input = [
    ...positionals,
    ...(values.port ?? []),
  ].flatMap(value => value.split(','))
  const ports = input.length
    ? input.map((value) => {
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535)
          throw new Error(`端口必须是 1–65535 的整数：${value}；使用 pnpm ports --help 查看用法。`)
        return Number(value)
      })
    : Object.values(projectPorts)
  return {
    ports: [
      ...new Set(ports),
    ],
    force: values.force === true,
  }
}

/** 查询选定端口的监听进程；没有监听者返回空数组，查询失败保留系统错误。 */
async function findListeners(ports) {
  if (process.platform === 'win32') {
    const { stdout } = await execute('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `
      $ErrorActionPreference = 'Stop'
      $selected = @(${ports.join(',')})
      $owners = @(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in $selected } | Select-Object -ExpandProperty OwningProcess -Unique)
      ConvertTo-Json -InputObject $owners -Compress
    `,
    ])
    return JSON.parse(stdout)
  }
  try {
    const { stdout } = await execute('lsof', [
      '-nP',
      '-t',
      `-iTCP:${ports.join(',')}`,
      '-sTCP:LISTEN',
    ])
    return [
      ...new Set(stdout.trim().split(/\s+/).filter(Boolean).map(Number)),
    ]
  }
  catch (error) {
    // lsof 用 1 表示未匹配到监听者；有诊断或其他状态时必须暴露失败。
    if (error.code === 1 && !error.stdout && !error.stderr)
      return []
    if (error.code === 'ENOENT')
      throw new Error('找不到 lsof；请安装该系统工具后重试。', { cause: error })
    throw error
  }
}

/** 只终止指定端口对应的监听者；force 显式使用 SIGKILL，权限或查询错误直接失败。 */
export async function clearPorts(ports, { force = false } = {}) {
  const pids = await findListeners(ports)
  for (const pid of pids) process.kill(pid, force ? 'SIGKILL' : 'SIGTERM')
  // SIGTERM 返回不代表监听已关闭；真实延迟退出场景必须等端口释放后再启动 dev。
  const deadline = Date.now() + 5000
  while (pids.length && (await findListeners(ports)).length) {
    if (Date.now() >= deadline)
      throw new Error(`选定端口未在 5 秒内全部释放：${ports.join('、')}；确认进程后可用 pnpm ports --force 显式终止。`)
    await delay(50)
  }
  return { ports, pids }
}

/** CLI 入口；帮助无副作用，失败由调用方或直接执行入口处理。 */
export async function main(args = process.argv.slice(2)) {
  const options = parsePorts(args)
  if (options.help) {
    console.log(`用法：pnpm ports [端口...] [-p 端口] [--force]
默认项目端口：${Object.values(projectPorts).join('、')}。
显式端口替换默认列表，支持空格、逗号和重复的 --port / -p。
默认发送 SIGTERM 并等待端口释放；5 秒未释放则失败，--force 显式使用 SIGKILL。
macOS / Linux 需要 lsof，Windows 使用 PowerShell Get-NetTCPConnection。
示例：pnpm ports 3000 3001；pnpm ports -p 4000 -p 5000。
根 pnpm dev 会在启动 Turbo 前先清理默认项目端口。`)
    return
  }
  const result = await clearPorts(options.ports, { force: options.force })
  console.log(`${result.pids.length
    ? `端口已释放（已请求停止进程 ${result.pids.join('、')}）`
    : '端口空闲，无监听进程'}：${result.ports.join('、')}`)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`端口清理失败：${error.message}`)
    process.exitCode = 1
  })
}
