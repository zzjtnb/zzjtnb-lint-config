import process from 'node:process'

/**
 * 各类项目通用的生成物、依赖和非样式资源；项目特有路径仍通过 `ignoreFiles` 显式追加。
 *
 * 共享包不能把 `ignoreFiles` 写成相对路径，否则 Stylelint 可能以共享包自身目录或
 * `configBasedir` 解析，最终错误地扫描消费方的 `node_modules`。使用调用方 CWD
 * 可以让同一份配置在 monorepo、单包和 CI 中保持一致。
 */
const defaultPatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  // Tauri 的 Cargo 编译 / 打包输出与生成工程目录（schema、Android、Apple）。
  // Stylelint 默认只检查前端源样式，不重复扫描生成工程及其资源副本；这是检查范围，不是 Git 忽略策略。
  // 不扩大到其他项目的 target / gen，也不排除整个 src-tauri；自定义输出目录由消费方追加。
  '**/src-tauri/target/**',
  '**/src-tauri/gen/**',
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

/**
 * 将共享默认 glob 转为消费方项目根目录下的绝对忽略路径。
 * @param cwd 本次调用的消费项目目录，支持 POSIX 和 Windows 路径。
 * @param globs 相对于消费项目的忽略模式，默认使用共享生成物与依赖列表。
 * @returns 使用正斜杠且根路径不含重复分隔符的绝对忽略模式。
 */
export function createIgnorePatterns(
  cwd = process.cwd(),
  globs: readonly string[] = defaultPatterns,
): string[] {
  const normalizedCwd = cwd.replace(/\\/g, '/').replace(/\/$/, '')
  // 工作目录是字面路径，不是 glob：括号、方括号等不能参与模式匹配。
  // 使用字符类转义而不是反斜杠，避免 Stylelint 将反斜杠按 Windows 路径分隔符规范化。
  const literalCwd = normalizedCwd.replace(/[()[\]{}*?!+@]/g, '[$&]')
  return globs.map(glob => `${literalCwd}/${glob}`)
}
