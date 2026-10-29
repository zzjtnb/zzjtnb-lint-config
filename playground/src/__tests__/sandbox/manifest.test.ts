/** 防止工作区专属的 catalog 协议泄漏给浏览器内 pnpm 8。 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { runtimeManifest } from '../../../scripts/manifest'

it('运行清单转换全部安装依赖字段，保留可选 peer 与导出契约', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.tmp/runtime-manifest')
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'package-'))
  await mkdir(join(directory, 'node_modules', 'example'), { recursive: true })
  await writeFile(join(directory, 'node_modules', 'example', 'package.json'), JSON.stringify({ name: 'example', version: '1.2.3' }))
  const filename = join(directory, 'package.json')
  await writeFile(filename, JSON.stringify({
    name: 'runtime-example',
    exports: { '.': './index.js' },
    dependencies: { example: 'catalog:' },
    peerDependencies: { example: 'catalog:compat' },
    optionalDependencies: { example: 'catalog:default' },
    peerDependenciesMeta: {
      example: { optional: true },
    },
    scripts: { test: 'vitest' },
    devDependencies: { vitest: 'catalog:' },
  }))
  expect(await runtimeManifest(filename)).toEqual({
    name: 'runtime-example',
    exports: { '.': './index.js' },
    dependencies: { example: '1.2.3' },
    peerDependencies: { example: '1.2.3' },
    optionalDependencies: { example: '1.2.3' },
    peerDependenciesMeta: {
      example: { optional: true },
    },
  })
})
