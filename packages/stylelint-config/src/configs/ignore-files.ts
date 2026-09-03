import process from 'node:process'

/**
 * 各类项目通用的生成物、依赖和非样式资源；项目特有路径仍通过 `ignoreFiles` 显式追加。
 *
 * 共享包不能把 `ignoreFiles` 写成相对路径，否则 Stylelint 可能以共享包自身目录或
 * `configBasedir` 解析，最终错误地扫描消费方的 `node_modules`。使用调用方 CWD
 * 可以让同一份配置在 monorepo、单包和 CI 中保持一致。
 */
const defaultIgnoreGlobs = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.wrangler/**',
  '**/coverage/**',
  '**/*.js',
  '**/*.jsx',
  '**/*.tsx',
  '**/*.ts',
  '**/*.json',
  '**/*.md',
] as const

/** 将共享默认 glob 转为消费方项目根目录下的绝对忽略路径。 */
export function ignoreFiles(
  cwd = process.cwd(),
  globs: readonly string[] = defaultIgnoreGlobs,
): string[] {
  const normalizedCwd = cwd.replace(/\\/g, '/')
  return globs.map(glob => `${normalizedCwd}/${glob}`)
}

/** 基于调用时工作目录生成的默认忽略列表。 */
export const defaultIgnoreFiles = ignoreFiles()
