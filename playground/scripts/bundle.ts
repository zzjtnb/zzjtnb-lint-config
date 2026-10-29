/** 预编译 ESLint 配置的静态依赖，减少 WebContainer 首次 ESM 加载；保留动态插件与资源边界。 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { promisify } from 'node:util'
import ts from 'typescript'
import { root } from './utils/index'

/** 构建 CJS 运行资源并记录构建日志；工具、模块解析或构建失败直接报告，不退回删减配置。 */
export async function bundleESLint() {
  const shared = createRequire(join(root, 'packages/eslint/package.json'))
  const upstream = shared.resolve('@antfu/eslint-config')
  const local = createRequire(upstream)
  const css = JSON.parse(await readFile(local.resolve('@eslint/css-tree/package.json'), 'utf8'))
  const directory = join(root, '.tmp/playground/eslint-bundle')
  await mkdir(directory, { recursive: true })
  const filename = join(directory, 'build.config.mjs')
  await writeFile(filename, `import { defineConfig } from ${JSON.stringify(import.meta.resolve('tsdown'))}
export default defineConfig({
  // 读取本次工作区实际安装的上游公开入口。
  entry: [${JSON.stringify(upstream)}],
  // 生成物位于工作区临时目录；正式资源由 runtime.ts 发布。
  outDir: ${JSON.stringify(directory)},
  // 保留该目录的构建配置与日志。
  clean: false,
  // WebContainer 的 CJS 加载不需要重复遍历整个 ESM 静态依赖图。
  format: 'cjs',
  // 为包内 import.meta 提供 Node.js 等价环境。
  shims: true,
  // 运行资源无需声明文件。
  dts: false,
  // 降低传输及解析体积，不混淆规则名称或删除配置。
  minify: true,
  plugins: [{
    name: 'preserve-dynamic-dependencies',
    resolveDynamicImport(source) {
      // 语言插件按原包位置加载，不把可选模块提前执行。
      if (typeof source === 'string' && !source.startsWith('.') && !source.startsWith('node:')) return { id: source, external: true }
      return null
    },
  }],
  deps: {
    // 资源定位、类型 API 和共享 composer 身份必须保留原有模块边界。
    neverBundle: ['eslint-flat-config-utils', 'eslint-plugin-n', '@eslint/css-tree', '@shadcn/lint', 'typescript', /^@typescript-eslint\\//, 'eslint', /^eslint\\//, /^node:/],
    // 仅预编译本轮实测的静态导入，不减少启用规则。
    alwaysBundle: ['@antfu/eslint-config', 'local-pkg', 'eslint-plugin-command', '@e18e/eslint-plugin', '@eslint-community/eslint-plugin-eslint-comments', 'eslint-plugin-antfu', 'eslint-plugin-import-lite', 'eslint-plugin-perfectionist', 'eslint-plugin-unicorn', 'eslint-plugin-unused-imports', 'globals', 'eslint-merge-processors', 'eslint-plugin-regexp'],
  },
})
`)
  // 构建器归实际消费者 Playground，临时配置显式引用该工作区的已安装入口。
  const { stdout, stderr } = await promisify(execFile)('pnpm', [
    '--config.verifyDepsBeforeRun=error',
    'exec',
    'tsdown',
    '--config',
    filename,
  ], {
    cwd: join(root, 'playground'),
    maxBuffer: 4 * 1024 * 1024,
  })
  await writeFile(join(directory, 'build.log'), stdout + stderr)
  return { contents: await readFile(join(directory, 'index.cjs'), 'utf8'), cssVersion: css.version as string }
}

/**
 * 将浏览器副本中的 antfu 静态导入接到预编译 CJS 资源，保留原有导入绑定。
 * @param source 共享配置包构建后的 ESM 源码，不修改磁盘上的正式产物。
 * @returns 仅替换上游导入后的源码；缺少上游导入时抛出错误。
 */
export function rewriteESLintImports(source: string): string {
  const file = ts.createSourceFile('config.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const imports = file.statements.filter(ts.isImportDeclaration).filter(statement => ts.isStringLiteral(statement.moduleSpecifier)
    && statement.moduleSpecifier.text === '@antfu/eslint-config')
  if (!imports.length)
    throw new Error('ESLint 配置入口未找到上游导入，无法生成预编译资源')
  for (const declaration of imports.toReversed()) {
    source = source.slice(0, declaration.getStart(file)) + renderRuntimeImport(declaration) + source.slice(declaration.end)
  }
  return source
}

/** 将默认、具名或命名空间导入绑定映射到预编译模块的原始导出。 */
function renderRuntimeImport(declaration: ts.ImportDeclaration): string {
  const load = '(await import(new URL(\'./playground.cjs\', import.meta.resolve(\'@antfu/eslint-config\')).href)).default'
  const clause = declaration.importClause
  const bindings = clause?.namedBindings
  if (bindings && ts.isNamespaceImport(bindings)) {
    const namespace = `const ${bindings.name.text} = ${load};`
    return clause.name
      ? `${namespace}\nconst ${clause.name.text} = ${bindings.name.text}.default;`
      : namespace
  }
  const names = clause?.name
    ? [`default: ${clause.name.text}`]
    : []
  if (bindings && ts.isNamedImports(bindings)) {
    for (const item of bindings.elements) names.push(`${JSON.stringify((item.propertyName ?? item.name).text)}: ${item.name.text}`)
  }
  return names.length
    ? `const { ${names.join(', ')} } = ${load};`
    : `${load};`
}
