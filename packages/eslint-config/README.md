# @zzjtnb/eslint-config

[![@zzjtnb/eslint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/eslint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![许可证](https://npmx.dev/api/registry/badge/license/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![月下载量](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>TypeScript, Vue and pnpm ESLint Flat Config built on @antfu/eslint-config</strong></p>

<p align="center"><strong>English</strong> | <a href="./README.zh-CN.md">简体中文</a></p>

## What this package provides

`@zzjtnb/eslint-config` is a thin, opinionated wrapper around [`@antfu/eslint-config`](https://github.com/antfu/eslint-config).

- `@antfu/eslint-config` owns parsers, plugins, recommended rules and sorting integrations.
- This package enables the project integrations used by the repository and adds only documented rule overrides.
- The package does not reimplement antfu's sorting rules or install the parser and plugin packages already managed by antfu.
- This package also registers the `shadcn` plugin, without enabling all its rules or automatically ignoring generated code.
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

## TypeScript 7 and compiler APIs

TypeScript 7.0 does not expose the previous compiler API required by the current typescript-eslint. Use Microsoft's compatibility package and aliases to keep TS7's `tsc` while tools import the TS6 API from `typescript`:

```bash
pnpm add -D '@typescript/native@npm:typescript@7.0.2' 'typescript@npm:@typescript/typescript6@6.0.2'
pnpm exec tsc --version
pnpm exec tsc6 --version
```

`@typescript/native` provides TS7's `tsc`; the `typescript` alias provides the TS6 API and `tsc6`. With pnpm catalogs, centralize these entries and prevent workspace packages from resolving regular TS7 as their API dependency. This config neither patches upstream parsers nor disables version checks. Validate Vue SFC tooling, declaration generation and other API consumers independently.

See [Microsoft's side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).

## Minimal configuration

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

The default call enables the repository's TypeScript, Vue, JSON / JSONC, YAML, TOML, Markdown, Node, perfectionist and stylistic integrations. The pnpm integration follows antfu's default and is enabled only when a `pnpm-workspace.yaml` is found in the current directory or an ancestor. UnoCSS and external formatter integrations remain opt-in.

## Complete configuration

The following configuration retains language defaults, explicitly shows common integration switches, adds a project ignore, and overrides a rule and reporting options. It does not force pnpm on: detection still depends on whether `pnpm-workspace.yaml` exists. Use `zzjtnb()` when only the defaults are needed. Integration fields follow antfu rather than a package-specific option model.

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

  // Keep antfu stylistic rules. Set this to false when another formatter owns formatting.
  stylistic: true,
  unocss: false,
  formatters: false,

  // This array is appended to antfu's resolved ignore list.
  ignores: ['generated/**'],

  // These rules override all shared defaults by rule name.
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

The first argument follows antfu's global options and single Flat Config field model, with this package's additional `defaultIgnores` option. Put `files` in a later fragment, not in the first global options object. Later inputs accept configuration objects, arrays, asynchronous results, and existing `FlatConfigComposer` instances, expanded and appended by antfu in their original order.

| Input | Behavior |
| --- | --- |
| `typescript`, `vue`, `jsonc`, `yaml`, `toml`, `markdown`, `node`, `stylistic`, `unocss`, `formatters` and other antfu fields | Forwarded to `@antfu/eslint-config` without renaming or rewrapping |
| `pnpm` | Forwarded to antfu; this package additionally disables `pnpm/yaml-enforce-settings` so ESLint fix does not write workspace-policy settings |
| `rules` | Applied after all shared defaults, including JavaScript, TypeScript, Vue and TOML rules; later Flat Config fragments still take precedence |
| `linterOptions` | Native ESLint reporting options, applied without a file restriction; later matching fragments may override them |
| `imports` | Antfu import integration switch and object options; use `imports.overrides` for rule overrides, not `overrides.imports` |
| `ignores` | Arrays append to default ignores; a callback receives the defaults and determines the final result |
| `defaultIgnores` | An array replaces the package list; `false` takes over upstream and package defaults supplied through this option, without disabling the separate `.gitignore` integration |
| Later Flat Config fragments | Passed to antfu after the package's generated fragments; ESLint resolves their order and precedence |

Option names and object contracts follow antfu. Package defaults are supplied through the corresponding integration: package defaults, consumer group overrides, and object-level `overrides` apply in that order. Upstream cross-language order and declaration-file exemptions remain intact; language overrides are not replayed globally afterward. First-argument `rules` and later Flat Config fragments retain their higher precedence.

### Formatting ownership

This package enables antfu stylistic rules by default. If Oxfmt, Prettier or another formatter is the single formatting owner, disable the ESLint formatting rules at the configuration boundary:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  stylistic: false,
})
```

`stylistic: false` disables the stylistic rule integration. `stylistic: { semi: true }` keeps the integration enabled and changes only the `semi` option; these two values are not equivalent. Disabling stylistic does not disable sorting or other fixes from independent import, JSON, or YAML integrations. Assign ownership for actual conflicts when migrating formatters.

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

- Without `pnpm`, antfu enables the integration only when `pnpm-workspace.yaml` exists in the current directory or an ancestor, so npm and yarn projects need no setting.
- `pnpm: true` forces the integration on; it requires a `pnpm-workspace.yaml`, otherwise ESLint reports an error while loading `pnpm/*` rules for `package.json`.
- `pnpm: false` disables the antfu pnpm integration.
- `pnpm: { yaml: false, sort: false }` keeps pnpm package.json checks and disables pnpm-specific YAML integration and sorting. General YAML integration may still check and format the file. Top-level `yaml: false` supplies the pnpm YAML default, while explicit `pnpm.yaml` takes precedence. Use `ignores` to exclude the file completely.
- Other pnpm fields should be checked against the installed antfu version rather than copied into package-specific types.

Use object options only when the consuming project has `pnpm-workspace.yaml` and explicit control is needed:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  pnpm: { json: true, yaml: true, sort: true },
})
```

### Ignore behavior

Antfu's original ignore list remains active during the normal path. This package adds only project-independent generated-output and resource patterns such as `dist-*`, `*-dist`, Nitro output, Tauri `src-tauri/target` and `src-tauri/gen`, snapshots and font files. It does not ignore scripts, tests, CI configuration or repository-specific directories.

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

`defaultIgnores: false` delegates this option's ignore result to the consumer: an `ignores` array becomes the result without automatically including upstream or package defaults; an `ignores` callback goes directly to antfu without injecting the package list. This does not disable antfu's separate `.gitignore` integration or control later fragments and ESLint's own ignore behavior.

`defaultIgnores: [...]` replaces only the package list while retaining antfu defaults. On the normal path, an `ignores` callback receives the merged upstream and package list and determines the result. With `defaultIgnores: false`, the callback handles the list supplied by antfu itself.

Tauri exclusions are limited to generated projects and build output under `src-tauri`; unrelated `target` / `gen` directories and handwritten resources such as `src-tauri/resources` remain checked.

Each factory call owns the nested options of the rules added by this package, so modifying one result does not change those defaults in later calls. Only package-owned data is copied, not consumer inputs or upstream plugin implementations.

Declaration files (`.d.ts`, `.d.mts`, `.d.cts`) retain upstream `no-restricted-syntax` exemptions, including `export =` required to describe third-party CommonJS modules. Implementation files still use this package's syntax restrictions.

## Ownership and rule scope

The package does not duplicate antfu's sorting implementation. Import / export sorting, package.json sorting, tsconfig sorting, pnpm workspace sorting and perfectionist sorting continue to come from antfu.

The package adds a small set of explicit rule overrides, including relaxed chaining, list-newline, control-flow brace and top-level-function conventions, plus the repository's `no-restricted-syntax` and comment-spacing policy. The exact rule map is part of the published package and can be overridden through the `rules` field. First-argument `rules` are high-priority global overrides and can replace language and declaration-file exemptions. Prefer the owning integration, such as `overrides.javascript`, `overrides.vue`, or `imports.overrides`, when changing only one integration.

TOML disables both `spaced-comment` and `toml/spaced-comment` by default to preserve `#:schema <URL>` directives. Ordinary JavaScript comment-spacing rules remain active.

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

Merge this example into the consuming project's `.vscode/settings.json`, preserving existing settings. It disables overlapping save-time formatting and runs ESLint fixes on explicit saves. Adjust validated languages to the integrations the project actually uses:

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
    "json",
    "jsonc",
    "yaml",
    "toml"
  ]
}
```

The package does not enable an HTML formatter by default; add `html` to `eslint.validate` only after enabling the corresponding integration. Also decide whether ESLint should check Markdown code blocks or Markdownlint should own document checks before configuring the editor. `eslint.rules.customizations` hides matching editor diagnostics while retaining fixes. It does not disable those rules in the CLI.

## Scripts

```json
{
  "scripts": {
    "lint": "eslint . --cache --cache-location node_modules/.cache/.eslintcache",
    "format": "pnpm run lint --fix"
  }
}
```

`--fix`, `--cache` and `--cache-location` are ESLint CLI options. The shareable config does not turn on file writes or caching implicitly. Whether warnings fail the command depends on the CLI policy; append `--max-warnings 0` when zero warnings are required.

## References

- [antfu/eslint-config customization](https://github.com/antfu/eslint-config#customization)
- [antfu/eslint-config options](https://github.com/antfu/eslint-config/blob/main/src/types.ts)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
