/** 验证仓库 ESLint 入口的生成物忽略范围。 */
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

const root = fileURLToPath(new URL('../../../', import.meta.url))
// ESLint 配置中的上游 Git 忽略解析以进程目录为准；每个 Node 测试文件独立运行。
process.chdir(root)
for (const explicit of [false, true]) {
  it(`ESLint 生成物忽略范围（显式入口：${explicit}）`, { timeout: 30000 }, async () => {
    const engine = new ESLint({
      cwd: root,
      ...explicit
        ? {
            overrideConfigFile: fileURLToPath(new URL('../../../eslint.config.js', import.meta.url)),
          }
        : {},
    })
    for (const path of ['playground/public/metadata/eslint/catalog.json', 'playground/public/runtime/eslint.json', 'playground/src/components.d.ts'])assert.equal(await engine.isPathIgnored(path), true, path)
    for (const path of ['playground/scripts/metadata.ts', 'packages/eslint/src/index.ts', 'scripts/preinstall/index.js'])assert.equal(await engine.isPathIgnored(path), false, path)
  })
}
