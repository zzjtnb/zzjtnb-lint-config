// ESLint 的配置文件：用我们发布的 `zzjtnb()` 工厂生成整套规则，不需要自己逐条配置。
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 文档交给 Markdownlint 检查，避免两套工具重复报告。
  markdown: false,
  // 想关掉某条规则，可以在这里加 `rules: { '规则名': 'off' }`。
})
