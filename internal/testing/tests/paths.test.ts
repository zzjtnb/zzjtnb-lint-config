/** 将实际配置复制到独立项目，验证不依赖仓库公共模块或调用目录。 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp } from 'node:fs/promises'
import { join, sep } from 'node:path'
import process from 'node:process'
import { it } from 'node:test'
import { pathToFileURL } from 'node:url'
import { paths } from './config.ts'

for (const [source, field, directory] of [
  ['packages/eslint/tests/config.ts', 'loading', 'tests'],
  ['packages/stylelint/tests/config.ts', 'types', 'tests'],
  ['packages/markdownlint/tests/config.ts', 'types', 'tests'],
  ['playground/config.ts', 'results', ''],
] as const) {
  it(`${source} 独立运行并保留中文和特殊字符路径`, async () => {
    await mkdir(paths.modules, { recursive: true })
    const fixture = await mkdtemp(paths.modules)
    const root = join(fixture, '独立 #项目')
    const target = join(root, directory, 'config.ts')
    await mkdir(join(root, directory), { recursive: true })
    await copyFile(join(paths.repository, source), target)
    const script = `import { paths } from ${JSON.stringify(pathToFileURL(target).href)}; console.log(JSON.stringify({ root: paths.root, output: paths[${JSON.stringify(field)}] }))`
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: fixture,
      encoding: 'utf8',
    }))
    assert.equal(result.root, root)
    assert.ok(result.output.startsWith(join(root, '.tmp', 'project') + sep))
    if (directory)
      assert.ok(result.output.endsWith(sep), '保留 mkdtemp 使用的末尾分隔符')
  })
}
