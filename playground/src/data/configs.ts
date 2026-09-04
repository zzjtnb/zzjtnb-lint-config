import type { PlaygroundConfig, PlaygroundMode } from '../../types.ts'

// 工作台使用的正式文档地址，不依赖文档站的工程配置。
const docs = (path: string) => new URL(path, 'https://lint.docs.zzjtnb.com/').href

export const configurations: Record<PlaygroundMode, PlaygroundConfig> = {
  eslint: {
    name: 'ESLint',
    packageName: '@zzjtnb/eslint-config',
    summary: 'JavaScript、TypeScript 与 Vue 的代码规范',
    configFile: 'eslint.config.ts',
    language: 'TypeScript',
    config: `import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 文档交给 Markdownlint，避免重复检查。
  markdown: false,
})
`,
    install: 'pnpm add -D eslint @zzjtnb/eslint-config',
    command: 'pnpm exec eslint .',
    docs: docs('eslint'),
    examples: [
      { filename: 'sample.ts', label: 'TypeScript', code: 'import { readFileSync } from \'node:fs\'\n\nconst greeting = "Hello, lint lab"\nconsole.log(greeting)\n' },
      { filename: 'sample.js', label: 'JavaScript', code: '//注释也需要空格\nconst message = "Hello, lint lab"\nconsole.log(message)\n' },
      { filename: 'sample.vue', label: 'Vue SFC', code: '<script setup lang="ts">\ndefineProps<{ label?: string }>()\n</script>\n\n<template>\n  <button>{{ label }}</button>\n</template>\n' },
      { filename: 'sample.toml', label: 'TOML', code: '#:schema https://developers.openai.com/codex/config-schema.json\nname= "lint-lab"\n' },
      { filename: 'sample.json', label: 'JSON', code: '{"name":"lint-lab","enabled":true}\n' },
      { filename: 'sample.yaml', label: 'YAML', code: 'name: "lint-lab"\nenabled: true\n' },
    ],
  },
  stylelint: {
    name: 'Stylelint',
    packageName: '@zzjtnb/stylelint-config',
    summary: 'CSS、SCSS 与 Vue 样式的统一约定',
    configFile: 'stylelint.config.ts',
    language: 'TypeScript',
    config: `import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 仅追加项目特有的忽略路径。
  ignoreFiles: ['**/generated/**'],
})
`,
    install: 'pnpm add -D stylelint @zzjtnb/stylelint-config',
    command: 'pnpm exec stylelint "**/*.{css,scss,vue,html}" --config stylelint.config.ts',
    docs: docs('stylelint'),
    examples: [
      { filename: 'sample.css', label: 'CSS', code: '.card {\n  color: #FFFFFF;\n  display: flex;\n  width: 10rpz;\n}\n' },
      { filename: 'sample.scss', label: 'SCSS', code: '$brand: #FFFFFF;\n\n.card {\n  color: $brand;\n  display: grid;\n  @apply p-4;\n  width: 24rpx;\n}\n' },
      { filename: 'sample.vue', label: 'Vue SFC', code: '<template>\n  <div class="card">示例</div>\n</template>\n\n<style scoped>\n:slotted(.card) {\n  color: #FFFFFF;\n  display: flex;\n}\n</style>\n' },
      { filename: 'sample.html', label: 'HTML', code: '<style>\n.card {\n  color: #FFFFFF;\n  display: flex;\n}\n</style>\n<div class="card">示例</div>\n' },
    ],
  },
  markdownlint: {
    name: 'Markdownlint',
    packageName: '@zzjtnb/markdownlint-config',
    summary: '面向文档写作的 Markdown 规则',
    configFile: '.markdownlint-cli2.jsonc',
    language: 'JSONC',
    config: `{
  // 读取项目的 Git 忽略配置。
  "gitignore": true,
  // 扫描范围由消费方维护。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  "config": {
    // 继承共享规则，下面可以继续覆盖同名规则。
    "extends": "@zzjtnb/markdownlint-config"
  }
}
`,
    install: 'pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config',
    command: 'pnpm exec markdownlint-cli2 "**/*.md"',
    docs: docs('markdownlint'),
    examples: [
      { filename: 'sample.md', label: 'Markdown', code: '# 配置笔记\n\n## 重复章节\n\n这里是第一段正文。\n\n## 重复章节\n\n- 第一项\n- 第二项' },
    ],
  },
}
