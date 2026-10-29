/** 通用构建与测试产物排除，按调用时的消费项目工作目录生成绝对 glob。 */
import process from 'node:process'

/**
 * 各类项目通用的生成物和非样式资源；依赖目录沿用 Stylelint 原生忽略。
 *
 * 共享包不能把 `ignoreFiles` 写成相对路径，否则 Stylelint 可能以共享包自身目录或
 * `configBasedir` 解析，导致消费方的构建产物未被正确排除。使用调用方 CWD
 * 可以让同一份配置在 monorepo、单包和 CI 中保持一致。
 */
const defaultPatterns = [
  '**/dist/**',
  '**/build/**',
  // 备份副本不是当前源码，默认在任意目录层级排除。
  '**/backup/**',
  // 代码索引由分析工具生成，不作为手写源码检查。
  '**/.codegraph/**',
  // 临时验证与工具材料不是项目源码，任意层级均默认排除。
  '**/.tmp/**',
  // Git 元数据与工具缓存不是源码，显式文件参数也默认排除。
  '**/.git/**',
  '**/.cache/**',
  // 框架服务端构建输出，不作为源码检查。
  '**/.output/**',
  // 这类目录不作为前端源码检查，消费方需要检查时可显式接管 ignoreFiles。
  '**/src-tauri/**',
  '**/releases/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.wrangler/**',
  '**/coverage/**',
  // Playwright 生成的 HTML 报告与测试附件，不作为手写样式检查。
  '**/playwright-report/**',
  '**/test-results/**',
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
