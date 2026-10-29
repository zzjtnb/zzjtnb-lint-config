/** 生成与官方演示相同的服务文件树，依赖交由浏览器 Node.js 包管理器安装。 */
import type { FileSystemTree } from '@webcontainer/api'
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import ts from 'typescript'
import { configurations, defaults } from '../src/stores/config/catalog'
import { samples } from '../src/stores/experiment/samples'
import { bundleESLint, rewriteESLintImports } from './bundle'
import { runtimeManifest } from './manifest'
import { root } from './utils/index'

const execute = promisify(execFile)

/** 按 Node.js 查找顺序定位实际安装包，配置版本来自当前构建环境。 */
async function locate(name: string, from: string): Promise<string> {
  let directory = from
  while (true) {
    try {
      return await realpath(join(directory, 'node_modules', name))
    }
    catch {
      const parent = dirname(directory)
      if (parent === directory)
        throw new Error(`缺少运行依赖 ${name}`)
      directory = parent
    }
  }
}

const output = join(root, 'playground/public/runtime')
await mkdir(output, { recursive: true })
const engines = {
  eslint: ['@eslint/config-array', 'eslint', 'typescript'],
  stylelint: ['stylelint'],
  markdownlint: ['markdownlint-cli2'],
}
for (const [mode, names] of Object.entries(engines)) {
  const tree: FileSystemTree = {}
  const current = mode as keyof typeof configurations
  tree['warmup-config.mjs'] = {
    file: {
      contents: defaults(current),
    },
  }
  tree['warmup.json'] = {
    file: {
      contents: JSON.stringify(configurations[current].targets.map(target => ({
        mode: current,
        filename: target.filename,
        source: samples[target.filename.split('.').pop()!] ?? '',
        overrides: {},
        config: '',
      }))),
    },
  }
  const dependencies: Record<string, string> = {}
  if (mode === 'eslint') {
    const bundle = await bundleESLint()
    tree['config-bundle.cjs'] = {
      file: { contents: bundle.contents },
    }
    // 保留需要按文件定位数据的包，确保 CJS 资源可按原生契约解析。
    dependencies['@eslint/css-tree'] = bundle.cssVersion
  }
  for (const name of names) {
    const path = await locate(name, join(root, 'playground'))
    dependencies[name] = JSON.parse(await readFile(join(path, 'package.json'), 'utf8')).version
  }
  const path = join(root, 'packages', mode)
  const manifest = await runtimeManifest(join(path, 'package.json'))
  const contents: FileSystemTree = {}
  if (mode === 'markdownlint') {
    contents['index.jsonc'] = {
      file: { contents: await readFile(join(path, 'index.jsonc'), 'utf8') },
    }
  }
  // 三个包都复制构建后的 ESM 入口；Markdownlint 额外保留根 JSONC 规则。
  const dist: FileSystemTree = {}
  for (const file of await readdir(join(path, 'dist'))) {
    if (file.endsWith('.mjs')) {
      let source = await readFile(join(path, 'dist', file), 'utf8')
      // 仅修改浏览器副本，默认与具名导入共同保留；正式包产物不变。
      if (mode === 'eslint' && file === 'index.mjs')
        source = rewriteESLintImports(source)

      dist[file] = {
        file: { contents: source },
      }
    }
  }
  contents.dist = { directory: dist }
  const packageJSON = JSON.stringify(manifest)
  contents['package.json'] = {
    file: {
      contents: packageJSON,
    },
  }
  tree.packages = {
    directory: {
      [mode]: { directory: contents },
    },
  }
  dependencies[manifest.name] = `file:./packages/${mode}`
  const runtimeJSON = JSON.stringify({ private: true, type: 'module', dependencies })
  tree['package.json'] = {
    file: {
      contents: runtimeJSON,
    },
  }
  // 与 WebContainer 内置 pnpm 8 匹配，构建期解析传递依赖，浏览器仅按锁文件下载和链接。
  const lockDirectory = join(root, '.tmp/playground/lockfiles', mode)
  await mkdir(join(lockDirectory, 'packages', mode), { recursive: true })
  await writeFile(join(lockDirectory, 'package.json'), runtimeJSON)
  await writeFile(join(lockDirectory, 'packages', mode, 'package.json'), packageJSON)
  await writeFile(join(lockDirectory, 'pnpm-workspace.yaml'), 'packages:\n  - .\n')
  const { stdout, stderr } = await execute('pnpm', [
    '--package=pnpm@8.15.6',
    'dlx',
    'pnpm',
    'install',
    '--lockfile-only',
    '--no-frozen-lockfile',
    '--ignore-scripts',
    '--reporter=append-only',
  ], {
    cwd: lockDirectory,
    maxBuffer: 4 * 1024 * 1024,
  })
  await writeFile(join(lockDirectory, 'generation.log'), stdout + stderr)
  tree['pnpm-lock.yaml'] = {
    file: { contents: await readFile(join(lockDirectory, 'pnpm-lock.yaml'), 'utf8') },
  }
  const runner: FileSystemTree = {}
  for (const name of [
    'index',
    mode,
    ...(mode === 'eslint'
      ? ['config']
      : []),
  ]) {
    const source = await readFile(join(root, `playground/sandbox/${name}.ts`), 'utf8')
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: `${name}.ts`,
    })
    runner[`${name}.mjs`] = {
      file: {
        contents: result.outputText.replace(/\.\/(config|eslint|stylelint|markdownlint)\.ts/g, './$1.mjs'),
      },
    }
  }
  tree.runner = { directory: runner }
  await writeFile(join(output, `${mode}.json`), JSON.stringify(tree))
}
console.log('三个工具服务独立生成；进入对应工具时才安装依赖')
