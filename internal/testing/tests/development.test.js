/** 用独立 Turbo 工作区验证根开发入口的失败隔离，不启动真实服务或占用端口。 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { cliPath } from '../helpers/cli.js'

for (const dependencyFailure of [false, true]) {
  it(`独立开发服务不因${dependencyFailure ? '其他服务的构建依赖' : '其他服务'}失败而退出`, { timeout: 15000 }, async (t) => {
    const root = new URL('../../../', import.meta.url)
    const parent = new URL('../../../.tmp/dev-isolation/', import.meta.url)
    await mkdir(parent, { recursive: true })
    const directory = await mkdtemp(fileURLToPath(new URL('workspace-', parent)))
    const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'dev-isolation', private: true, packageManager: manifest.packageManager }))
    await writeFile(join(directory, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n')
    await writeFile(join(directory, 'turbo.json'), JSON.stringify({
      // 模拟真实任务边界：开发服务先等待自己的依赖构建，两个应用互不依赖。
      tasks: {
        build: { cache: false },
        dev: {
          dependsOn: ['^build'],
          cache: false,
          persistent: true,
        },
      },
    }))
    for (const name of ['docs', 'playground', 'engine']) await mkdir(join(directory, 'apps', name), { recursive: true })
    await writeFile(join(directory, 'apps/docs/package.json'), JSON.stringify({
      name: '@fixture/docs',
      scripts: { dev: 'node server.mjs' },
    }))
    await writeFile(join(directory, 'apps/playground/package.json'), JSON.stringify({
      name: '@fixture/playground',
      scripts: {
        dev: dependencyFailure ? 'node -e "console.log(\'PLAYGROUND_STARTED\')"' : 'node fail.mjs',
      },
      ...(dependencyFailure
        ? {
            dependencies: { '@fixture/engine': 'workspace:*' },
          }
        : {}),
    }))
    await writeFile(join(directory, 'apps/engine/package.json'), JSON.stringify({
      name: '@fixture/engine',
      scripts: { build: 'node fail.mjs' },
    }))
    await writeFile(join(directory, 'apps/docs/server.mjs'), `
import { writeFileSync } from 'node:fs'
writeFileSync('../../ready', '')
console.log('DOCS_READY')
setInterval(() => console.log('DOCS_HEARTBEAT'), 100)
`)
    const failure = `
import { existsSync } from 'node:fs'
const timer = setInterval(() => {
  if (!existsSync('../../ready')) return
  clearInterval(timer)
  console.error('FIXTURE_FAILED')
  process.exit(1)
}, 20)
`
    for (const name of ['engine', 'playground']) await writeFile(join(directory, 'apps', name, 'fail.mjs'), failure)
    const [, ...args] = manifest.scripts.dev.split(' ')
    const child = spawn(process.execPath, [
      cliPath('turbo', 'turbo', new URL('package.json', root)),
      ...args,
    ], {
      cwd: directory,
      env: { ...process.env, CI: '1', TURBO_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const exited = once(child, 'exit')
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null)
        child.kill('SIGTERM')
      await exited
    })
    await new Promise((resolve, reject) => {
      let failed = false
      let heartbeats = 0
      let output = ''
      const inspect = (chunk) => {
        const text = String(chunk)
        output += text
        if (text.includes('FIXTURE_FAILED'))
          failed = true
        if (failed)
          heartbeats += text.split('DOCS_HEARTBEAT').length - 1
        if (heartbeats >= 3) {
          assert.equal(child.exitCode, null)
          assert.equal(child.signalCode, null)
          if (dependencyFailure)
            assert.ok(!output.includes('PLAYGROUND_STARTED'))
          resolve()
        }
      }
      child.stdout.on('data', inspect)
      child.stderr.on('data', inspect)
      child.once('error', reject)
      child.once('exit', code => reject(new Error(`开发服务提前退出（${code}）：\n${output}`)))
    })
  })
}
