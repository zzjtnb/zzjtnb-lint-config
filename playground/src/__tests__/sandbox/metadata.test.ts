/** 通过与生成器相同的 Node/Jiti 环境验证默认配置和元数据，不将浏览器草稿当作发布快照。 */
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

it('元数据不启用默认源码已关闭的 Markdown，Stylelint 保留默认源码的项目忽略项', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
  const inspector = pathToFileURL(resolve(root, 'playground/scripts/lib/eslint.ts')).href
  const defaults = pathToFileURL(resolve(root, 'playground/scripts/lib/defaults.ts')).href
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { createJiti } from 'jiti'
    const jiti = createJiti(import.meta.url)

    const { inspect } = await jiti.import(${JSON.stringify(inspector)})
    const { loadDefaults } = await jiti.import(${JSON.stringify(defaults)})
    const metadata = await inspect('module.ts')
    const styles = await loadDefaults('stylelint')
    console.log(JSON.stringify({
      markdown: metadata.configs.some(config => config.name.startsWith('antfu/markdown/')),
      ignores: styles.ignoreFiles,
    }))
  `], {
    cwd: resolve(root, 'playground'),
    encoding: 'utf8',
    timeout: 25000,
  })
  const result = JSON.parse(output)
  expect(result.markdown).toBe(false)
  expect(result.ignores).toContain('**/generated/**')
}, 30000)
