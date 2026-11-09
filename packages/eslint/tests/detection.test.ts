/** 用独立 Node.js 进程验证真实消费目录中的自动检测，避免模块缓存影响检测结果。 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, realpath, symlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'
import { paths } from './config'

const execute = promisify(execFile)
const parent = paths.detection.consumers
const scripts = paths.detection.scripts
const entry = new URL('../dist/index.mjs', import.meta.url).href
const packages = {
  typescript: new URL('../../../apps/demo/node_modules/typescript', import.meta.url),
  vue: new URL('../../../docs/node_modules/vue', import.meta.url),
}

it.each([
  {
    name: '纯 JavaScript',
    dependencies: [],
    options: {},
    typescript: false,
    vue: false,
  },
  {
    name: 'TypeScript',
    dependencies: ['typescript'],
    options: {},
    typescript: true,
    vue: false,
  },
  {
    name: 'Vue',
    dependencies: ['vue'],
    options: {},
    typescript: false,
    vue: true,
  },
  {
    name: 'Vue 与 TypeScript',
    dependencies: ['vue', 'typescript'],
    options: {},
    typescript: true,
    vue: true,
  },
  {
    name: '显式关闭',
    dependencies: ['vue', 'typescript'],
    options: { typescript: false, vue: false },
    typescript: false,
    vue: false,
  },
  {
    name: '显式开启',
    dependencies: [],
    options: { typescript: true, vue: true },
    typescript: true,
    vue: true,
  },
] as const)('$name 消费工程沿用上游检测与显式选项', async ({ dependencies, options, typescript, vue }) => {
  await mkdir(parent, { recursive: true })
  await mkdir(scripts, { recursive: true })
  const directory = await mkdtemp(parent)
  await mkdir(join(directory, 'node_modules'))
  await writeFile(join(directory, 'package.json'), '{"private":true,"type":"module"}')
  for (const name of dependencies)
    await symlink(await realpath(packages[name]), join(directory, 'node_modules', name), 'junction')
  const scriptDirectory = join(scripts, basename(directory))
  await mkdir(scriptDirectory, { recursive: true })
  const filename = join(scriptDirectory, 'check.ts')
  await writeFile(filename, `import { zzjtnb } from ${JSON.stringify(entry)}
const configs = await zzjtnb({ gitignore: false, pnpm: false, isInEditor: false, ...${JSON.stringify(options)} })
console.log(JSON.stringify({
  typescript: configs.some(config => config.name === 'antfu/typescript/rules'),
  vue: configs.some(config => config.name === 'antfu/vue/rules'),
  a11y: configs.some(config => config.plugins?.['vue-a11y']),
}))
`)
  const result = await execute(process.execPath, [filename], { cwd: directory })
  expect(JSON.parse(result.stdout)).toEqual({ typescript, vue, a11y: vue })
}, 30_000)
