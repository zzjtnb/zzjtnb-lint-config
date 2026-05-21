# eslint-config-zzjtnb

<p align="center">
  <a href="https://npmjs.com/package/eslint-config-zzjtnb"><img src="https://img.shields.io/npm/v/eslint-config-zzjtnb?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/eslint-config-zzjtnb"><img src="https://img.shields.io/npm/dm/eslint-config-zzjtnb?color=50a8d8" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <strong>English | <a href="./README.zh-CN.md">简体中文</a></strong>
</p>

<p align="center">
  <strong>Modern ESLint flat config for TypeScript, Vue, UnoCSS and formatting</strong>
</p>

## Features

- Built on top of [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)
- ESM-first ESLint flat config
- TypeScript support enabled by default
- Vue support enabled by default
- UnoCSS ordering and blocklist support enabled by default
- HTML formatter enabled by default through `eslint-plugin-format`; CSS / SCSS are left to `stylelint-config-zzjtnb`
- Sensible shared ignores for generated and local-only directories
- Typed exports for configuration options and reusable defaults
- Warns on stale or unused ESLint inline configuration comments
- Small preset helpers for base, Vue and UnoCSS scenarios

## Requirements

| Package | Version |
| --- | --- |
| Node.js | `^20.19.0 || ^22.13.0 || >=24` |
| ESLint | `^10.4.0` |

This package is ESM-only. Use `eslint.config.js` in a project with `"type": "module"`, or use `eslint.config.mjs` if your project is not ESM.

## Installation

```bash
pnpm add -D eslint eslint-config-zzjtnb
```

The config already depends on the shared integrations it enables:

- `@antfu/eslint-config`
- `eslint-plugin-format`
- `@unocss/eslint-plugin`

## Basic usage

Create `eslint.config.js`:

```js
import zzjtnb from 'eslint-config-zzjtnb'

export default zzjtnb()
```

## TypeScript usage

The package exports types for projects that use `eslint.config.ts` or want stronger editor hints:

```ts
import type { EslintConfigOptions } from 'eslint-config-zzjtnb'
import zzjtnb from 'eslint-config-zzjtnb'

const options = {
  ignores: ['generated/**'],
} satisfies EslintConfigOptions

export default zzjtnb(options)
```

## Presets

```js
import zzjtnb, { base, uno, vue } from 'eslint-config-zzjtnb'

// Full default: TypeScript + Vue + UnoCSS + HTML formatter
export default zzjtnb()

// Base JavaScript / TypeScript config, without Vue and UnoCSS
export const baseConfig = base()

// Vue-focused config: Vue is explicitly enabled, UnoCSS stays enabled by default
export const vueConfig = vue()

// UnoCSS-focused config: UnoCSS is explicitly enabled, Vue stays enabled by default
export const unoConfig = uno()
```

## Options

The default export accepts the same first-argument options as `@antfu/eslint-config`, plus these commonly used fields:

```js
import zzjtnb from 'eslint-config-zzjtnb'

export default zzjtnb({
  // Enabled by default
  typescript: true,
  vue: true,
  unocss: true,
  jsonc: true,
  yaml: true,
  toml: true,

  // Enable stricter library-oriented rules for packages
  type: 'lib',

  // Extend default ignores
  ignores: ['generated/**'],

  // Override style preferences
  stylistic: {
    indent: 2,
    quotes: 'single',
  },

  // Extend formatter settings, or set to false to disable them
  formatters: {
    html: true,
    // Enable this only if CSS / SCSS are not handled by Stylelint
    // css: true,
  },

  // Markdown lint is disabled by default and left to markdownlint-cli2
  markdown: false,

  // Extend ESLint Flat Config linter options
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

Additional flat config objects can be passed after the options object:

```js
import zzjtnb from 'eslint-config-zzjtnb'

export default zzjtnb(
  {
    vue: false,
    unocss: false,
  },
  {
    rules: {
      'no-console': 'warn',
    },
  },
)
```

## Default behavior

### Enabled integrations

| Integration | Default |
| --- | --- |
| TypeScript | enabled |
| Vue | enabled |
| UnoCSS | enabled |
| JSON / JSONC | enabled |
| YAML | enabled |
| TOML | enabled |
| Markdown lint | disabled |
| CSS formatter | disabled by default, use Stylelint instead |
| HTML formatter | enabled |

### Default ignores

The config ignores common generated directories, local-only paths and special documentation files:

- `node_modules`
- `dist`
- `build`
- `.nuxt`
- `.turbo`
- `.vercel`
- `.wrangler`
- `coverage`
- `backup`
- `src-tauri`
- `src-tauri-harmony`
- `stats.html`
- `twa/project`
- `fonts`
- `shadcn-vue`
- `packages/*/README*.md`

## VS Code setup

Recommended `.vscode/settings.json`:

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always",
    "source.organizeImports": "never"
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue",
    "html",
    "json",
    "jsonc",
    "yaml",
    "toml"
  ]
}
```

## Scripts

Typical project scripts:

```json
{
  "scripts": {
    "lint": "eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache"
  }
}
```

`--fix`, `--cache` and `--cache-location` are ESLint CLI / Node API execution options, not Flat Config fields. Unlike Stylelint, an ESLint shareable config cannot enable them from the config object, so the recommended `lint` script includes `--fix` by default.

If you want CI to fail on warnings as well, append `--max-warnings 0` to the script. It is intentionally not part of the default example because application teams may want to adopt zero-warning enforcement gradually.

## Notes

- This config is designed for modern ESM projects.
- It intentionally follows `@antfu/eslint-config` conventions: single quotes, no semicolons, sorted imports and flat config composition.
- Use `base()` for packages that should not enable Vue or UnoCSS rules.

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
