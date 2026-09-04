import { zzjtnb } from '@zzjtnb/eslint-config'

// 工作台自身消费公开入口；Markdown 正文由根目录的 Markdownlint 统一检查。
export default zzjtnb({
  markdown: false,
})
