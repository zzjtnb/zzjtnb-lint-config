/** 通过真实 CLI2 验证详细配置示例中的扫描与规则覆盖。 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { findPackageJSON } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

it('完整 CLI2 示例保留共享规则并应用文档中的覆盖和排除', async () => {
  const source = await readFile(new URL('../../../docs/src/markdownlint/configuration.md', import.meta.url), 'utf8')
  const example = /```js \[\.markdownlint-cli2\.mjs\]\n([\s\S]*?)\n```/.exec(source)![1]!
  const root = fileURLToPath(new URL('../../../.tmp/markdownlint-docs/', import.meta.url))
  await mkdir(root, { recursive: true })
  const cwd = await mkdtemp(join(root, 'consumer-'))
  await writeFile(join(cwd, 'example.mjs'), example.replace('\'@zzjtnb/markdownlint-config/config\'', JSON.stringify(import.meta.resolve('@zzjtnb/markdownlint-config/config'))))
  // 夹具位于被 Git 忽略的 .tmp；只为测试关闭 Git 忽略，不改写被验证示例的配置值。
  await writeFile(join(cwd, '.markdownlint-cli2.mjs'), 'import config from \'./example.mjs\'\nexport default { ...config, gitignore: false }\n')
  await mkdir(join(cwd, 'generated-docs'))
  await writeFile(join(cwd, 'generated-docs', 'ignored.md'), '# 标题\n\n## 重复\n\n## 重复\n')
  await writeFile(join(cwd, 'sample.md'), '# 标题\n\n正文。\n')
  const manifestPath = findPackageJSON('markdownlint-cli2', import.meta.url)!
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const command = join(dirname(manifestPath), manifest.bin['markdownlint-cli2'])
  const run = promisify(execFile)
  // globs 从示例配置读取，生成文档应被项目追加的忽略项排除。
  await run(process.execPath, [command], { cwd })
  await writeFile(join(cwd, 'sample.md'), `# 标题\n\n${'word '.repeat(30).trim()}\n`)
  await expect(run(process.execPath, [command], { cwd })).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining('MD013'),
  })
}, 30_000)
