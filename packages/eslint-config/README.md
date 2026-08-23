# @zzjtnb/eslint-config

<p align="center">
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/v/%40zzjtnb%2Feslint-config?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/dm/%40zzjtnb%2Feslint-config?color=50a8d8" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center"><strong>TypeScript / Vue / pnpm ESLint flat config built on @antfu/eslint-config</strong></p>

<p align="center"><strong>English</strong> | <a href="./README.zh-CN.md">简体中文</a></p>

## Scope

This package is a thin organization wrapper around [`@antfu/eslint-config`](https://github.com/antfu/eslint-config):

- parsers, plugins, recommended rules and sorting are owned by antfu;
- this package adds only organization defaults, a few organization rules and reusable async factories;
- it does not directly install `eslint-plugin-jsonc`, `eslint-plugin-n`, `eslint-plugin-pnpm`, `eslint-plugin-vue` or `yaml-eslint-parser`;
- it does not remove or override sorting already supplied by antfu;
- it only adds an organization rule where antfu has no equivalent, such as cspell array sorting.

## Requirements

| Package | Version |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.4.0` |

The package is ESM-only. Prefer `eslint.config.ts`; use `eslint.config.js` in an ESM project or `eslint.config.mjs` otherwise.

## Install and use

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

```ts
// eslint.config.ts
import { defineConfig } from '@zzjtnb/eslint-config'

export default defineConfig()
```

The default config enables TypeScript, Vue, JSON / JSONC, YAML, TOML, Node, pnpm and antfu sorting. CSS / SCSS are not handled by ESLint; use `@zzjtnb/stylelint-config`. UnoCSS and Markdown lint remain opt-in.

## `stylistic` options

`stylistic` is **not limited to `semi`**. It accepts a boolean or an object:

```ts
// Disable all antfu stylistic formatting rules.
export default defineConfig({ stylistic: false })

// Enable stylistic and require semicolons; all other fields keep upstream defaults.
export default defineConfig({ stylistic: { semi: true } })

// Explicitly enable upstream stylistic defaults.
export default defineConfig({ stylistic: true })
```

In the current `@antfu/eslint-config`, `OptionsConfig['stylistic']` exposes:

| Field | Type | Purpose | Upstream default |
| --- | --- | --- | --- |
| `indent` | `2`, `4`, `'tab'` and other upstream-supported values | Indentation level and tab strategy | `2` |
| `quotes` | `'single'`, `'double'`, `'backtick'` | Quote style | `'single'` |
| `jsx` | `boolean` | Enable stylistic rules for JSX | `true` |
| `semi` | `boolean` | Require semicolons | `false` |
| `braceStyle` | `'1tbs'`, `'stroustrup'`, `'allman'` | Brace layout style | `'stroustrup'` |
| `experimental` | `boolean` | Enable upstream experimental stylistic rules | `false` |

These are **upstream antfu options**, not fields invented by this package. The package exports the current object type as `ESLintStylisticOptions`:

```ts
import type { ESLintStylisticOptions } from '@zzjtnb/eslint-config'

const styleOptions = {
  quotes: 'single',
  semi: false,
} satisfies ESLintStylisticOptions
```

References:

- antfu customization: [github.com/antfu/eslint-config#customization](https://github.com/antfu/eslint-config#customization)
- antfu stylistic factory: [`src/configs/stylistic.ts`](https://github.com/antfu/eslint-config/blob/main/src/configs/stylistic.ts)
- ESLint Stylistic: [eslint.style](https://eslint.style/)

`stylistic: false` disables the whole formatting integration. `stylistic: { semi: true }` enables it and overrides only `semi`.

## Public exports and ownership

The public API has three groups:

| Export | Purpose |
| --- | --- |
| Named export `defineConfig()` | Create the complete ESLint flat config |
| `base()`, `vue()`, `uno()` | Create common project presets |
| `javascript()`, `ignores()`, `jsonc()`, `node()`, `perfectionist()`, `pnpm()`, `typescript()`, `yaml()` | Compose individual configuration factories |
| `ESLintConfigOptions`, `ESLintStylisticOptions` | Typed consumer options |

The factories return `Promise<Linter.Config[]>` and can be exported directly from `eslint.config.ts`. Parsers, plugins, recommended rules and sorting are owned by `@antfu/eslint-config`; this package adds only organization defaults and a small number of rules not covered upstream.

### Sorting ownership

This package does not duplicate:

- import / export and named import / named export sorting;
- package.json, tsconfig.json and pnpm workspace YAML sorting;
- perfectionist object, interface and module sorting.

Those rules follow antfu unchanged. A package-specific sort rule is added only when antfu has no equivalent, such as sorting cspell `words` and `ignorePaths` arrays.

### Optional integrations and dependencies

The package directly depends only on `@antfu/eslint-config`; it does not install parsers or `eslint-plugin-*` packages already managed by antfu. UnoCSS and formatters follow antfu's optional dependency model: install their upstream optional dependencies only when enabling them.

CSS / SCSS support is provided through antfu's optional `formatters` integration, but it is disabled by default because the project uses `@zzjtnb/stylelint-config`. Markdown lint is also disabled by default because the project uses `markdownlint-cli2`.

## Options

The package accepts `@antfu/eslint-config` options and adds these fields:

| Field | Default | Purpose |
| --- | --- | --- |
| `defaultIgnores` | Package defaults | Replace the shared ignore list with an array, or disable it with `false` |
| `pnpmWorkspace` | `true` | Enable the parser, rules and sorting for `pnpm-workspace.yaml` |
| `rules` | `{}` | Add or override shared package rules |
| `ignores` | `[]` | Append consumer paths after the selected default ignores |
| `linterOptions` | Two warnings | Set the report level for unused ESLint comments |

```ts
import { defineConfig } from '@zzjtnb/eslint-config'

export default defineConfig({
  // Upstream option: enable stricter library-oriented rules.
  type: 'lib',

  // Upstream option: let another formatter own formatting completely.
  stylistic: false,

  // Upstream option: require semicolons and keep other stylistic defaults.
  // stylistic: { semi: true },

  // Package option: append generated paths to the ignore list.
  ignores: ['generated/**'],

  // Package option: do not lint pnpm-workspace.yaml.
  pnpmWorkspace: false,

  // Package option: override a shared rule.
  rules: { 'no-console': 'error' },

  // Flat Config option: warnings do not fail ESLint by themselves.
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

For the full upstream option set, use [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) and the antfu README. Do not duplicate an upstream field as a package-specific option.

## Presets

```ts
import { base, defineConfig, uno, vue } from '@zzjtnb/eslint-config'

// Full default configuration.
export default defineConfig()

// JavaScript / TypeScript without Vue and UnoCSS.
export const baseConfig = base()

// Explicit Vue preset.
export const vueConfig = vue()

// Explicit UnoCSS preset; install the optional upstream dependency yourself.
export const unoConfig = uno()
```

## Defaults

| Integration | Default | Owner |
| --- | --- | --- |
| TypeScript | enabled | antfu `typescript()` |
| Vue | enabled | antfu `vue()` + package conventions |
| Node | enabled | antfu `node()` |
| JSON / JSONC | enabled | antfu `jsonc()` + cspell supplement |
| YAML | enabled | antfu `yaml()` |
| TOML | enabled | antfu main factory |
| pnpm | enabled | antfu `pnpm()` |
| perfectionist | enabled | antfu main factory |
| UnoCSS | disabled | optional upstream integration |
| Markdown | disabled | use markdownlint-cli2 |
| External formatters | disabled | use Stylelint for CSS / SCSS; antfu fallback is opt-in |

### CSS / SCSS and Markdown fallback

When a consumer does not use the project's Stylelint or Markdownlint setup, enable antfu's built-in integrations explicitly:

```ts
export default defineConfig({
  // Requires antfu's optional eslint-plugin-format peer.
  formatters: { css: true },
  // Enables antfu's Markdown rules instead of markdownlint-cli2.
  markdown: true,
})
```

`formatters: { markdown: 'prettier' }` can additionally format Markdown through antfu's formatter integration. See antfu's documentation for the optional formatter dependencies and supported values.

### pnpm workspace

`pnpm()` calls antfu's public factory with:

- `json: true` for pnpm catalog / workspace checks in package.json;
- `yaml: true` for the pnpm-workspace.yaml parser;
- `sort: true` for workspace YAML sorting by default.

`pnpmWorkspace: false` disables only the workspace YAML part and keeps pnpm package.json checks. By default this package disables antfu's `pnpm/yaml-enforce-settings`, so it does not auto-write `shellEmulator: true` or `trustPolicy: no-downgrade`; catalog checks and YAML sorting remain enabled. Enable that behavior only when explicitly needed with `pnpm({ enforceSettings: true })`.

### Default ignores

The package additionally ignores generated outputs, test fixtures, native projects and local agent directories, including:

- `dist-*`, `*-dist`, `.output` and `output`;
- `.github`, `.agent`, `.codex`, `.cursor`, `.claude` and `.agents`;
- `fixtures`, snapshots and VitePress cache;
- `releases`, `src-tauri` and `twa/project`;
- shell scripts and font assets.

Use `defaultIgnores: false` to disable these package defaults, or pass an array to replace them. `ignores` is then appended.

## VS Code

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always",
    "source.organizeImports": "never"
  },
  "eslint.validate": ["javascript", "typescript", "vue", "json", "jsonc", "yaml", "toml"]
}
```

## Scripts

```json
{
  "scripts": {
    "lint": "eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache"
  }
}
```

`--fix`, `--cache` and `--cache-location` are ESLint CLI flags, not Flat Config fields. A shareable config does not silently change the consumer's execution strategy.

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
