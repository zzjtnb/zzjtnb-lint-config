import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 根入口聚合各工作区源码；语言依赖声明在子工作区，因此显式选择检查范围。
  typescript: true,
  vue: true,
  // 文档统一交给 Markdownlint，其他语言配置仍保留。
  markdown: false,
})
