import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Markdown 由 markdownlint 检查。
  markdown: false,
  ignores: ['**/.vitepress/dist/**', '**/.vitepress/cache/**'],
})
