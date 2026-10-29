/** 只终止本测试创建的临时监听进程，不操作项目的真实开发端口。 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createConnection } from 'node:net'
import process from 'node:process'
import { beforeEach, describe, it } from 'node:test'
import { ports as projectPorts } from '../config.ts'
import { clearPorts, main, parsePorts } from '../index.js'

const owned = new Set()
const sendSignal = process.kill.bind(process)

/** 创建带延迟退出处理的独立进程，真实复现发送信号后端口尚未释放的窗口。 */
async function listener(t) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    import { createServer } from 'node:net'
    const server = createServer(socket => socket.end())
    server.listen(0, '127.0.0.1', () => process.send(server.address().port))
    process.on('SIGTERM', () => setTimeout(() => server.close(() => process.disconnect()), 400))
  `], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  owned.add(child.pid)
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL')
    owned.delete(child.pid)
  })
  const [port] = await once(child, 'message', {
    signal: AbortSignal.timeout(5000),
  })
  return port
}

/** 探测真实 TCP 端口；连接失败原样拒绝，由测试断言失败原因。 */
function connect(port) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve()
    })
    socket.once('error', reject)
  })
}

describe('端口参数与无副作用入口', () => {
  it('无参数只解析项目默认端口，显式列表替换而非追加默认值', () => {
    assert.deepStrictEqual(parsePorts([]).ports, Object.values(projectPorts))
    assert.deepStrictEqual(parsePorts(['4100', '4200,4100', '-p', '4300']).ports, [4100, 4200, 4300])
  })
  for (const args of [
    ['0'],
    ['65536'],
    ['3.5'],
    ['3000', 'wrong'],
    ['3000,'],
    ['--unknown'],
  ]) {
    it(`全部参数验证完成后才允许操作：${JSON.stringify(args)}`, () => {
      assert.throws(() => parsePorts(args))
    })
  }
  it('帮助与模块导入不会清理端口', async (t) => {
    const output = t.mock.method(console, 'log', () => {})
    t.mock.method(process, 'kill', () => {
      throw new Error('帮助不应发送信号')
    })
    await main(['--help'])
    assert.equal(output.mock.callCount(), 1)
  })
})

describe('真实端口生命周期', () => {
  beforeEach((t) => {
    // 测试即使查询逻辑回归，也只允许终止本测试创建的进程。
    t.mock.method(process, 'kill', (pid, signal) => {
      assert.ok(owned.has(pid), `不得终止非测试进程：${pid}`)
      return sendSignal(pid, signal)
    })
  })
  it('等待延迟退出的进程释放端口后才返回，dev 不会抢先启动', { timeout: 10000 }, async (t) => {
    const port = await listener(t)
    await connect(port)
    await clearPorts([port])
    await assert.rejects(connect(port), { code: 'ECONNREFUSED' })
  })
  it('一次处理多个显式端口，已空闲的端口再次执行也成功', { timeout: 10000 }, async (t) => {
    const first = await listener(t)
    const second = await listener(t)
    const untouched = await listener(t)
    await clearPorts([first, second], { force: true })
    await assert.rejects(connect(first), { code: 'ECONNREFUSED' })
    await assert.rejects(connect(second), { code: 'ECONNREFUSED' })
    await connect(untouched)
    assert.deepStrictEqual((await clearPorts([first, second])).pids, [])
  })
})
