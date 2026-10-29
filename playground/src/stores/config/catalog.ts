import type { PlaygroundConfig, PlaygroundMode } from '../../../types'

// 工作台使用的正式文档地址，不依赖文档站的工程配置。
const docs = (path: string) => new URL(path, 'https://lint.docs.zzjtnb.com/').href

export const configurations: Record<PlaygroundMode, PlaygroundConfig> = {
  eslint: {
    name: 'ESLint',
    packageName: '@zzjtnb/eslint-config',
    summary: 'JavaScript、TypeScript 与 Vue 的代码规范',
    configFile: 'eslint.config.js',
    language: 'JavaScript',
    config: `import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 文档交给 Markdownlint，避免重复检查。
  markdown: false,
})
`,
    install: 'pnpm add -D eslint @zzjtnb/eslint-config',
    scripts: {
      lint: 'eslint . --cache --cache-location node_modules/.cache/.eslintcache',
      format: 'pnpm run lint:eslint --fix',
    },
    docs: docs('eslint'),
    targets: [
      { filename: 'module.ts', label: 'TypeScript' },
      { filename: 'module.js', label: 'JavaScript' },
      { filename: 'component.vue', label: 'Vue SFC' },
      { filename: 'settings.toml', label: 'TOML' },
      { filename: 'module.json', label: 'JSON' },
      { filename: 'settings.yaml', label: 'YAML' },
    ],
  },
  stylelint: {
    name: 'Stylelint',
    packageName: '@zzjtnb/stylelint-config',
    summary: 'CSS、SCSS 与 Vue 样式的统一约定',
    configFile: 'stylelint.config.js',
    language: 'JavaScript',
    config: `import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 仅追加项目特有的忽略路径。
  ignoreFiles: ['**/generated/**'],
})
`,
    install: 'pnpm add -D stylelint @zzjtnb/stylelint-config',
    scripts: {
      lint: 'stylelint "**/*.{css,scss,vue,html,htm}" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache',
      format: 'pnpm run lint:stylelint --fix',
    },
    docs: docs('stylelint'),
    targets: [
      { filename: 'stylesheet.css', label: 'CSS' },
      { filename: 'stylesheet.scss', label: 'SCSS' },
      { filename: 'component.vue', label: 'Vue SFC' },
      { filename: 'document.html', label: 'HTML' },
    ],
  },
  markdownlint: {
    name: 'Markdownlint',
    packageName: '@zzjtnb/markdownlint-config',
    summary: '面向文档写作的 Markdown 规则',
    configFile: 'markdownlint-cli2.mjs',
    language: 'JavaScript',
    config: `// 复用共享扫描策略，项目只追加实际差异。\nexport { default } from '@zzjtnb/markdownlint-config/config'\n`,
    install: 'pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config',
    scripts: {
      lint: 'markdownlint-cli2 --config markdownlint-cli2.mjs "**/*.md"',
      format: 'pnpm run lint:markdownlint --fix',
    },
    docs: docs('markdownlint'),
    targets: [
      { filename: 'document.md', label: 'Markdown' },
    ],
  },
}

/** 浏览器执行与预热共用的默认模块，保持与当前配置包一致。 */
export function defaults(mode: PlaygroundMode) {
  return mode === 'markdownlint'
    ? `import { createRequire } from 'node:module'\nimport { readConfig } from 'markdownlint-cli2/markdownlint/promise'\nimport jsonc from 'markdownlint-cli2/parsers/jsonc'\nconst require = createRequire(import.meta.url)\n\nconst base = await readConfig(require.resolve('@zzjtnb/markdownlint-config'), [jsonc])\nexport default base\n`
    : configurations[mode].config.replace('markdown: false,', 'pnpm: false,\n  markdown: false,')
}
