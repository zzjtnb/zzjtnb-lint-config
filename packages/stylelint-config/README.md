# stylelint-config-zzjtnb

<p align="center">
  <a href="https://npmjs.com/package/stylelint-config-zzjtnb"><img src="https://img.shields.io/npm/v/stylelint-config-zzjtnb?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/stylelint-config-zzjtnb"><img src="https://img.shields.io/npm/dm/stylelint-config-zzjtnb?color=50a8d8" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <strong>English | <a href="./README.zh-CN.md">简体中文</a></strong>
</p>

<p align="center">
  <strong>Stylelint config for modern CSS, SCSS, Vue SFC, UnoCSS and Tailwind-style workflows</strong>
</p>

## Features

- Built for Stylelint 17
- ESM-first package entry
- Built-in TypeScript declarations for editor autocomplete
- Recommended CSS and SCSS error-detection rules
- Vue SFC `<style>` block support
- HTML inline style support
- Logical CSS property ordering through `stylelint-config-clean-order`
- UnoCSS and Tailwind-compatible at-rules and functions
- SCSS directives such as `@use`, `@mixin` and `@include`
- `rpx` unit support for uni-app style projects
- Default ignores for generated, dependency and local-only directories

## Requirements

| Package | Version |
| --- | --- |
| Node.js | `>=20.19.0` |
| Stylelint | `^17.12.0` |

This package is ESM-first. Use `stylelint.config.ts` by default for typed configuration. If a project cannot load TypeScript config files, use `stylelint.config.js` in a project with `"type": "module"`, or `stylelint.config.mjs` otherwise.

## Installation

```bash
pnpm add -D stylelint stylelint-config-zzjtnb
```

The config includes these shared presets and syntax parsers:

- `stylelint-config-recommended-scss`
- `stylelint-config-recommended-vue`
- `stylelint-config-clean-order`
- `postcss-html`
- `postcss-scss`

## Basic usage

Create `stylelint.config.ts`:

```ts
import type { Config } from 'stylelint'

export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
} satisfies Config
```

This package follows the standard Stylelint shareable config contract: the default export is a plain Stylelint configuration object, and consumers should keep `stylelint-config-zzjtnb` as the visible entry in `extends`. Named exports such as `stylelintExecutionOptions`, `stylelintLanguageOptions`, `stylelintReportOptions`, `stylelintRules`, `stylelintIgnoreFiles` and `stylelintOverrides` are only for local composition when you need to append project-specific settings.

Add scripts to `package.json`:

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.ts --fix --cache --cache-location node_modules/.cache/.stylelintcache"
  }
}
```

## What it includes

### Base presets

The config extends presets in this order:

1. `stylelint-config-recommended-scss`
2. `stylelint-config-recommended-vue/scss`
3. `stylelint-config-clean-order`

The order matters: CSS / SCSS error-detection rules come first, Vue SFC + SCSS rules are layered next, and property ordering is the last layer. HTML, Vue and SCSS parsing are handled by this package's own `overrides` with parser objects.

### UnoCSS and Tailwind support

The config allows common utility-first directives and functions, including:

- `@apply`
- `@screen`
- `@theme`
- `@layer`
- `@variants`
- `@responsive`
- `@custom-variant`
- `@container-queries`
- `theme()`

### SCSS support

The config supports common SCSS syntax:

- `@use`
- `@forward`
- `@mixin`
- `@include`
- `@function`
- `@extend`
- `@if`, `@for`, `@each`, `@while`

### Vue support

The config supports Vue SFC styles and Vue-specific selectors/functions:

- `:deep()` / `::v-deep`
- `:global()`
- `:slotted()` / `::v-slotted`
- `v-bind()`

### Built-in execution options

The config explicitly sets `allowEmptyInput: true`, `cache: false` and `fix: false`. This keeps monorepo packages with no style files quiet while avoiding hidden cache or file-writing behavior in the shared config.

Choose one visible place for execution behavior. Package scripts can declare `--fix --cache --cache-location node_modules/.cache/.stylelintcache`, while standalone or programmatic Stylelint usage may override `fix` and `cache` in the local config.

### Stylelint 17 language options

The config registers utility-first directives through `languageOptions.syntax.atRules` and `rpx` as a custom `length` unit through `languageOptions.syntax.units.length`. SCSS plugin compatibility reuses the same at-rule list where rule-level ignores are still required.

Experimental Stylelint fields such as `referenceFiles` and `processors` are intentionally not enabled by default. Configure them locally when your project has a concrete use case.

### Disable comment hygiene

The config reports descriptionless, invalid-scope, needless and unscoped `stylelint-disable` comments as warnings. This keeps long-lived projects cleaner without turning those maintenance checks into default blocking errors.

### Default ignores

Default ignored paths are resolved from `process.cwd()` so they work from the consuming project root:

- `node_modules`
- `dist`
- `build`
- `.nuxt`
- `.turbo`
- `.vercel`
- `.wrangler`
- `coverage`
- `backup`
- `releases`
- `src-tauri`
- `stats.html`
- `twa/project`

If you need to append local ignores, import the shared pieces and spread them explicitly.

Unlike ESLint, do not replace the file glob with `stylelint .`. Stylelint does not provide an ESLint-like `files` allowlist in config files, so the CLI input should stay restricted to style-bearing files. When using broad globs such as `stylelint "**/*.{css,scss,vue,html}"`, keep `--config stylelint.config.ts` in the script. This forces Stylelint to use the project root config instead of loading nested `.stylelintrc` files from backup or generated subprojects before shared ignores can apply.

## Customization

For simple zero-config usage, keep using `extends`:

```ts
export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
}
```

For transparent local customization, keep the package entry in `extends` and override only the pieces you need:

```ts
import {
  stylelintIgnoreFiles,
} from 'stylelint-config-zzjtnb'

export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],

  // Execution options can live in scripts or config, depending on how Stylelint is invoked.
  // Config-level fix/cache is useful for standalone or programmatic Stylelint usage.
  fix: true,
  cache: true,

  rules: {
    // Example: allow long hex colors
    'color-hex-length': null,

    // Example: change severity
    'declaration-block-no-duplicate-properties': [true, { severity: 'warning' }],
  },
  ignoreFiles: [
    ...stylelintIgnoreFiles,
    'generated/**',
  ],
}
```

If you prefer visible blank lines between declaration groups:

```ts
export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
  rules: {
    'declaration-empty-line-before': 'always',
    'at-rule-empty-line-before': 'always',
  },
}
```

## VS Code setup

Recommended `.vscode/settings.json`:

```json
{
  "css.validate": false,
  "scss.validate": false,
  "stylelint.validate": ["css", "scss", "vue", "html"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": "always"
  }
}
```

## Notes

- Stylelint does not provide an ESLint-like `files` allowlist in config files. Prefer controlling checked file types through CLI globs and editor `stylelint.validate`.
- Local `rules` with the same name replace shared rules. They do not deep-merge with rules from `extends`.
- If you need local `ignoreFiles`, prefer importing `stylelintIgnoreFiles` and appending with `...stylelintIgnoreFiles` so the shared ignores stay visible.
- `allowEmptyInput` is enabled in the shared config. `fix` and `cache` are disabled by default; enable them either through script flags such as `--fix --cache --cache-location node_modules/.cache/.stylelintcache` or through local config when that better fits how Stylelint is invoked.

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
