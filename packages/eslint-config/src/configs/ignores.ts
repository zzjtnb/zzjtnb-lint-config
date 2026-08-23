import type { OptionsConfig } from '@antfu/eslint-config'

/**
 * 当前组织在上游默认忽略项之外需要忽略的路径。
 *
 * 上游已经处理 node_modules、dist、coverage 等通用目录，这里只保留
 * monorepo 常见的构建产物、工具目录和不应参与源码检查的文件类型。
 */
export const defaultIgnores = [
  // 多种构建工具产生的带前后缀备用输出目录。
  '**/dist-*',
  '**/*-dist',
  // Git hooks 不属于需要 ESLint 解析的业务源码。
  '**/.husky',
  // Nitro 的内部构建输出不参与源码检查。
  '**/.nitro',
  // Nuxt / Nitro 的部署输出不参与源码检查。
  '**/.output',
  // Dockerfile 由容器工具链处理，不作为 JavaScript 文件解析。
  '**/Dockerfile',
  // 部署工具常见的输出目录不参与源码检查。
  '**/output',
  // 仓库自动化配置目录不参与业务源码检查。
  '**/.github',
  // Lefthook 配置由 Git hook 工具负责。
  '**/lefthook.yml',
  // Agent 运行时目录不属于项目源码。
  '**/.agent/**',
  // Codex 运行时目录不属于项目源码。
  '**/.codex/**',
  // Cursor 运行时目录不属于项目源码。
  '**/.cursor/**',
  // Claude 运行时目录不属于项目源码。
  '**/.claude/**',
  // 通用 Agent 配置目录不属于项目源码。
  '**/.agents/**',
  // 测试夹具只承载测试输入，不按业务源码规则检查。
  '**/fixtures/**',
  // Jest / Vitest 快照不是可独立解析的源码文件。
  '**/*.snap',
  // VitePress 缓存由文档工具生成，不参与检查。
  '**/.vitepress/cache/**',
  // Shell 脚本由 ShellCheck 等专用工具检查。
  '**/*.sh',
  // 字体资源不是 ESLint 支持的源码。
  '**/*.ttf',
  // Web 字体资源不是 ESLint 支持的源码。
  '**/*.woff',
  // 发布产物由各自发布工具链处理。
  '**/releases/**',
  // Tauri 原生工程由 Rust 工具链处理。
  '**/src-tauri/**',
  // 打包统计页面是生成产物，不参与源码检查。
  '**/stats.html',
  // Android TWA 工程由原生工具链处理。
  '**/twa/project/**',
]

/**
 * 默认忽略项工厂。
 *
 * 返回新数组而不是直接暴露默认数组，避免消费方追加目录时意外修改
 * 共享配置包中的全局默认值。
 */
export async function ignores(): Promise<string[]> {
  return [...defaultIgnores]
}

/**
 * 合并上游忽略项、本包忽略项和消费方忽略项。
 *
 * `@antfu/eslint-config` 传入函数时会提供它自己的忽略列表；传入
 * `defaultIgnores: false` 时，函数也不会再收到上游默认忽略项。
 */
export function resolveIgnores(
  ignores: OptionsConfig['ignores'] = [],
  defaultIgnoreList: string[] | false = defaultIgnores,
): OptionsConfig['ignores'] {
  // 函数形式需要收到 antfu 原始忽略列表，再由消费方决定如何扩展。
  if (typeof ignores === 'function') {
    return originals => ignores(defaultIgnoreList === false
      ? []
      : [...originals, ...defaultIgnoreList])
  }

  // false 表示消费方完全接管默认忽略项；否则按共享项再消费方项合并。
  return defaultIgnoreList === false
    ? ignores
    : [...defaultIgnoreList, ...ignores]
}
