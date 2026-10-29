/** 从公开 /config 入口检查生成声明，不为没有公开类型的 CLI2 复制配置接口。 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

it('发布声明保留忽略数组和继承路径的类型，支持消费方展开追加', async () => {
  const root = fileURLToPath(new URL('../../../.tmp/markdownlint-types/', import.meta.url))
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(`${root}/consumer-`)
  const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
  await writeFile(`${directory}/tsconfig.json`, JSON.stringify({
    // 检查正式 ESM 包声明，不生成文件，也不引入当前测试的全局类型。
    compilerOptions: {
      module: 'NodeNext',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
    },
    files: ['consumer.ts'],
  }))
  const source = `
import shared from '@zzjtnb/markdownlint-config/config'
export const config = {
  ...shared,
  ignores: [...shared.ignores, '**/generated/**'],
  config: { ...shared.config, MD013: false },
}
export const inherited: string = shared.config.extends
shared.ignores.push('**/vendor/**')
`
  await writeFile(`${directory}/consumer.ts`, source)
  const args = [
    compiler,
    '-p',
    directory,
    '--listFiles',
    '--pretty',
    'false',
  ]
  const result = await execFileAsync(process.execPath, args)
  expect(result.stdout.replaceAll('\\', '/')).toContain('/packages/markdownlint/dist/index.d.mts')
  await writeFile(`${directory}/consumer.ts`, `${source}\nshared.ignores.push(123)\n`)
  await expect(execFileAsync(process.execPath, args)).rejects.toMatchObject({
    code: 1,
    stdout: expect.stringMatching(/consumer\.ts.*error TS2345:/),
  })
}, 30_000)
