import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('真实服务启动仅解析所选类型配置，不执行检查或修复', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.tmp/playground/validation/selective-startup')
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'runner-'))
  const source = await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../../../sandbox/index.ts'), 'utf8')
  const runner = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/\.\/(eslint|stylelint|markdownlint)\.ts/g, './$1.mjs')
  // 本机管道没有 WebContainer 的 TTY；只适配测试宿主的 stdin，执行生产启动流程。
  await writeFile(join(directory, 'index.mjs'), `process.stdin.setRawMode = () => {};\n${runner}`)
  await writeFile(join(directory, 'eslint.mjs'), 'export async function execute(request) { console.log("CALL:" + JSON.stringify({ filename: request.filename, action: request.action })); return {} }')
  // 隔离预编译资源的安装目录，不能把测试文件写进工作区的真实依赖包。
  for (const name of ['@zzjtnb/eslint-config', '@antfu/eslint-config']) {
    const location = join(directory, 'node_modules', name)
    await mkdir(location, { recursive: true })
    await writeFile(join(location, 'package.json'), JSON.stringify({ name, type: 'module', exports: './index.mjs' }))
    await writeFile(join(location, 'index.mjs'), 'export default {}')
  }
  await writeFile(join(directory, 'config-bundle.cjs'), 'module.exports = {}')
  await writeFile(join(directory, 'warmup.json'), JSON.stringify(['module.ts', 'module.js', 'component.vue'].map(filename => ({ filename }))))
  const child = spawn(process.execPath, ['index.mjs', 'eslint', 'custom.vue'], {
    cwd: directory,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let output = ''
  try {
    await new Promise<void>((resolve, reject) => {
      child.stdout.on('data', (chunk) => {
        output += chunk.toString()
        if (output.includes('PLAYGROUND_READY'))
          resolve()
      })
      child.stderr.on('data', (chunk) => {
        output += chunk.toString()
      })
      child.once('error', reject)
      child.once('exit', (code) => {
        if (!output.includes('PLAYGROUND_READY'))
          reject(new Error(`运行器退出 ${code}: ${output}`))
      })
    })
    const calls = output.split('\n').filter(line => line.startsWith('CALL:')).map(line => JSON.parse(line.slice(5)))
    expect(calls).toEqual([
      { filename: 'component.vue', action: 'inspect' },
    ])
    expect(output).toContain('PLAYGROUND_WARMING:component.vue')
    expect(await readFile(join(directory, 'node_modules/@antfu/eslint-config/playground.cjs'), 'utf8')).toBe('module.exports = {}')
  }
  finally { child.kill() }
})
