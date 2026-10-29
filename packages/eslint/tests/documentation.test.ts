/** 用公开工厂运行文档中的按需扩展示例，验证配置与所提供插件一致。 */
import { readFileSync } from 'node:fs'
import { compileFunction } from 'node:vm'
import { zzjtnb } from '@zzjtnb/eslint-config'
import { expect, it } from 'vitest'

it('文档扩展示例直接加载随包提供的插件，不要求消费方另行安装', async () => {
  const source = readFileSync(new URL('../../../docs/src/eslint/presets.md', import.meta.url), 'utf8')
  const section = source.split('## 按需扩展\n')[1]!.split('\n## ')[0]!
  const example = /```js \[eslint\.config\.js\]\n([\s\S]*?)\n```/.exec(section)![1]!
  // 示例只有正式工厂导入；去掉该导入后注入当前公开入口，不复制配置值。
  const run = compileFunction(example.replace(/^import[^\n]*$/gm, '').replace('export default', 'return'), ['zzjtnb'])
  const configs: Awaited<ReturnType<typeof zzjtnb>> = await run(zzjtnb)
  const plugins = configs.flatMap(config => Object.keys(config.plugins ?? {}))
  expect(plugins).toEqual(expect.arrayContaining([
    'unocss',
    'vue-a11y',
    'format',
    'slop',
    'sonarjs',
    'shadcn',
    'zzjtnb',
  ]))
}, 30_000)

it('详细配置的完整示例可直接生成规则与文件覆盖', async () => {
  const source = readFileSync(new URL('../../../docs/src/eslint/configuration.md', import.meta.url), 'utf8')
  const example = /```js \[eslint\.config\.js\]\n([\s\S]*?)\n```/.exec(source)![1]!
  const run = compileFunction(example.replace(/^import[^\n]*$/gm, '').replace('export default', 'return'), ['zzjtnb'])
  const configs: Awaited<ReturnType<typeof zzjtnb>> = await run(zzjtnb)
  expect(configs.find(config => config.name === 'project/scripts')).toMatchObject({
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  })
  expect(configs.some(config => config.plugins?.slop && config.plugins?.sonarjs)).toBe(true)
}, 30_000)

const documents = [
  'eslint/index.md',
  'eslint/configuration.md',
  'eslint/presets.md',
  'quick-start.md',
  'engineering/debugging.md',
]
const examples = documents.flatMap((file) => {
  const source = readFileSync(new URL(`../../../docs/src/${file}`, import.meta.url), 'utf8')
  return [
    ...source.matchAll(/```js[^\n]*\n([\s\S]*?)\n```/g),
  ]
    .filter(([, code]) => code!.includes('export default zzjtnb(') && code!.includes('from \'@zzjtnb/eslint-config\''))
    .map(([, code], index) => ({ file, index: index + 1, code: code! }))
})

it.each(examples)('$file 工厂示例 $index 可从公开入口执行', async ({ code }) => {
  const run = compileFunction(code.replace(/^import[^\n]*$/gm, '').replace('export default', 'return'), ['zzjtnb'])
  const configs = await run(zzjtnb)
  expect(Array.isArray(configs)).toBe(true)
  expect(configs.length).toBeGreaterThan(0)
}, 30_000)
