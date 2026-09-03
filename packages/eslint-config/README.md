# @zzjtnb/eslint-config

<p align="center">
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/v/%40zzjtnb%2Feslint-config?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/dm/%40zzjtnb%2Feslint-config?color=50a8d8&label=downloads" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center"><strong>TypeScript, Vue and pnpm ESLint Flat Config built on @antfu/eslint-config</strong></p>

<p align="center"><strong>English</strong> | <a href="./README.zh-CN.md">简体中文</a></p>

## What this package provides

`@zzjtnb/eslint-config` is a thin, opinionated wrapper around [`@antfu/eslint-config`](https://github.com/antfu/eslint-config).

- `@antfu/eslint-config` owns parsers, plugins, recommended rules and sorting integrations.
- This package enables the project integrations used by the repository and adds only documented rule overrides.
- The package does not reimplement antfu's sorting rules or install the parser and plugin packages already managed by antfu.
- The only runtime export is the asynchronous `zzjtnb` factory.

The factory returns an ESLint Flat Config promise. It accepts the same first-argument option model as antfu, then accepts additional Flat Config fragments as later arguments.

## Requirements and installation

| Package | Version |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.4.0` |

The package is ESM-only. Use `eslint.config.ts` when the project and its ESLint setup support TypeScript configuration; otherwise use `eslint.config.js` in an ESM project or `eslint.config.mjs` in a non-ESM project.

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

## Minimal configuration

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

The default call enables the repository's TypeScript, Vue, JSON / JSONC, YAML, TOML, Markdown, Node, pnpm, perfectionist and stylistic integrations. UnoCSS and external formatter integrations remain opt-in.

## Complete configuration

The following file is a complete, copyable example. It keeps the shared defaults, explicitly shows the supported integration switches, adds one project ignore, changes one rule, and sets Flat Config linter options. The values shown for `jsonc`, `yaml`, `toml`, `markdown`, `node`, `typescript`, `vue`, `stylistic` and `pnpm` are forwarded to antfu; they are not new package-specific configuration fields.

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Integrations forwarded to @antfu/eslint-config.
  typescript: true,
  vue: true,
  jsonc: true,
  yaml: true,
  toml: true,
  markdown: true,
  node: true,

  // Keep pnpm package.json and workspace YAML support, including sorting.
  pnpm: {
    json: true,
    yaml: true,
    sort: true,
  },

  // Keep antfu stylistic rules. Set this to false when another formatter owns formatting.
  stylistic: true,
  unocss: false,
  formatters: false,

  // This array is appended to antfu's resolved ignore list.
  ignores: ['generated/**'],

  // These rules are added to the JavaScript / TypeScript config fragment.
  rules: {
    'no-console': 'warn',
  },

  // These are native ESLint Flat Config linter options.
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

To append another native Flat Config fragment, pass it after the first argument:

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  { stylistic: false },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)
```

## Configuration behavior

The first argument follows antfu's `OptionsConfig` plus this package's `defaultIgnores` option. Later arguments are appended as ESLint Flat Config fragments and are applied by ESLint in their normal order.

| Input | Behavior |
| --- | --- |
| `typescript`, `vue`, `jsonc`, `yaml`, `toml`, `markdown`, `node`, `stylistic`, `unocss`, `formatters` and other antfu fields | Forwarded to `@antfu/eslint-config` without renaming or rewrapping |
| `pnpm` | Forwarded to antfu; this package additionally disables `pnpm/yaml-enforce-settings` so ESLint fix does not write workspace-policy settings |
| `rules` | Used by this package's JavaScript / TypeScript fragment; a rule supplied by the consumer replaces the package value for that rule |
| `linterOptions` | Applied to the JavaScript / TypeScript fragment as native ESLint Flat Config linter options |
| `ignores` | Appended after antfu's default ignores and this package's generated-output ignores |
| `defaultIgnores` | Replaces the package's generated-output list; `false` makes the consumer's `ignores` value the complete ignore result |
| Later Flat Config fragments | Passed to antfu after the package's generated fragments; ESLint resolves their order and precedence |

No custom deep merge is performed for antfu options. A value supplied by the consumer is passed to antfu as written. For `rules`, the package adds its explicit overrides before the consumer's values so the consumer can replace them.

### Formatting ownership

This package enables antfu stylistic rules by default. If Oxfmt, Prettier or another formatter is the single formatting owner, disable the ESLint formatting rules at the configuration boundary:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  stylistic: false,
})
```

`stylistic: false` disables the stylistic rule integration. `stylistic: { semi: true }` keeps the integration enabled and changes only the `semi` option; these two values are not equivalent.

External formatter integration is separate from stylistic rules. Enable it only when the required antfu optional dependency is installed:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  formatters: { css: true },
})
```

For the complete formatter and stylistic option set, use the installed antfu version's [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) and its customization documentation.

### UnoCSS

UnoCSS support is disabled by default because it uses an optional upstream integration. Install the dependency required by the installed antfu version, then enable the integration explicitly:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  unocss: true,
})
```

### pnpm workspace

The `pnpm` object is owned by antfu, so its fields, defaults, parser registration and sorting behavior follow the installed antfu version. The package's only pnpm-specific rule change is disabling `pnpm/yaml-enforce-settings`; this prevents ESLint fix from silently writing settings such as `trustPolicy` or `shellEmulator` to `pnpm-workspace.yaml`.

- `pnpm: false` disables the antfu pnpm integration.
- `pnpm: { yaml: false, sort: false }` keeps package.json checks while disabling workspace YAML parsing and sorting.
- Other pnpm fields should be checked against the installed antfu version rather than copied into package-specific types.

### Ignore behavior

Antfu's original ignore list remains active during the normal path. This package adds only project-independent generated-output and resource patterns such as `dist-*`, `*-dist`, Nitro output, snapshots and font files. It does not ignore scripts, tests, CI configuration or repository-specific directories.

Use `ignores` for repository-specific paths:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  ignores: [
    'generated/**',
    'vendor/**',
  ],
})
```

Use `defaultIgnores: false` only when the consumer must define the complete ignore result:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  defaultIgnores: false,
  ignores: [
    'node_modules/**',
    'dist/**',
  ],
})
```

## Ownership and rule scope

The package does not duplicate antfu's sorting implementation. Import / export sorting, package.json sorting, tsconfig sorting, pnpm workspace sorting and perfectionist sorting continue to come from antfu.

The package adds a small set of explicit rule overrides, including relaxed chaining, list-newline, control-flow brace and top-level-function conventions, plus the repository's `no-restricted-syntax` and comment-spacing policy. The exact rule map is part of the published package and can be overridden through the `rules` field.

## Public exports

The package has one runtime export and four type exports:

| Export | Kind | Purpose |
| --- | --- | --- |
| `zzjtnb` | Function | Creates `Promise<Linter.Config[]>` for ESLint Flat Config |
| `ESLintConfigOptions` | Type | Type of the first factory argument, including `defaultIgnores` |
| `ESLintUserConfig` | Type | Type of later Flat Config fragments accepted by the factory |
| `ESLintPnpmOptions` | Type | Object form of antfu's `pnpm` options |
| `ESLintStylisticOptions` | Type | Object form of antfu's `stylistic` options |

The package has no default runtime export. Import `zzjtnb` as a named export.

## VS Code

The following settings match the ESLint-related entries in this repository's latest `.vscode/settings.json`. They disable overlapping formatting, run ESLint fixes only when explicitly requested by the editor, and validate every language enabled by this repository:

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off", "fixable": true },
    { "rule": "format/*", "severity": "off", "fixable": true },
    { "rule": "*-indent", "severity": "off", "fixable": true },
    { "rule": "*-spacing", "severity": "off", "fixable": true },
    { "rule": "*-spaces", "severity": "off", "fixable": true },
    { "rule": "*-order", "severity": "off", "fixable": true },
    { "rule": "*-dangle", "severity": "off", "fixable": true },
    { "rule": "*-newline", "severity": "off", "fixable": true },
    { "rule": "*quotes", "severity": "off", "fixable": true },
    { "rule": "*semi", "severity": "off", "fixable": true }
  ],
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

```json
{
  "scripts": {
    "lint": "eslint . --cache --cache-location node_modules/.cache/.eslintcache",
    "format": "pnpm run lint -- --fix"
  }
}
```

`--fix`, `--cache` and `--cache-location` are ESLint CLI options. The shareable config does not turn on file writes or caching implicitly.

## References

- [antfu/eslint-config customization](https://github.com/antfu/eslint-config#customization)
- [antfu/eslint-config options](https://github.com/antfu/eslint-config/blob/main/src/types.ts)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
