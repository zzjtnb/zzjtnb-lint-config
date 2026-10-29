/** CLI2 扫描入口；规则只维护在 index.jsonc，扫描选项与规则选项分层，消费方可分别覆盖。 */
import { fileURLToPath } from 'node:url'

export default {
  // 读取调用项目的 Git 忽略文件；未使用 Git 的项目仍保留下面的通用排除。
  gitignore: true,
  // 排除依赖、构建、备份和非前端目录；消费方追加时展开此数组，不重复抄写。
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/backup/**',
    // 代码索引由分析工具生成，不作为手写源码检查。
    '**/.codegraph/**',
    // 项目各层级的临时验证材料不参与文档检查。
    '**/.tmp/**',
    // Git 元数据与工具缓存不是源码，显式文件参数也默认排除。
    '**/.git/**',
    '**/.cache/**',
    // 框架服务端构建输出，不作为源码检查。
    '**/.output/**',
    '**/.nuxt/**',
    '**/.wrangler/**',
    '**/releases/**',
    '**/src-tauri/**',
  ],
  // src 与 dist 入口都位于包根的下一层；始终读取随包发布的规则，而非消费项目同名文件。
  config: {
    // 加载同一份共享规则，不在扫描配置中复制规则值。
    extends: fileURLToPath(new URL('../index.jsonc', import.meta.url)),
  },
}
