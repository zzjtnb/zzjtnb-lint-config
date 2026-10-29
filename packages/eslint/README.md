# @zzjtnb/eslint-config

[![@zzjtnb/eslint-config version](https://npmx.dev/api/registry/badge/version/@zzjtnb/eslint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![License](https://npmx.dev/api/registry/badge/license/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![Monthly downloads](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>TypeScript, Vue and pnpm ESLint Flat Config built on @antfu/eslint-config</strong></p>

<p align="center"><strong>English</strong> | <a href="https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint/README.zh-CN.md">简体中文</a></p>

## Overview

A shared ESLint configuration for TypeScript, JavaScript, and Vue. Vue accessibility and code-quality checks are enabled by default. UnoCSS and additional formatters can be enabled when needed.

[Documentation](https://lint.docs.zzjtnb.com/eslint)

## Requirements and installation

| Package | Version |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.13.0` |

The package is ESM-only. Use `eslint.config.js` with `"type": "module"` in your project package.json.

```bash
# Install ESLint and the shared configuration.
pnpm add -D eslint @zzjtnb/eslint-config
```

Declare `"type": "module"` in the project package.json and use `eslint.config.js`; no TypeScript configuration loader or extra runtime flag is needed. Projects without ESM enabled can use `eslint.config.mjs`.

## Minimal configuration

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

The default call enables the package's TypeScript, Vue, JSON / JSONC, YAML, TOML, Markdown, Node, perfectionist and stylistic integrations. The pnpm integration follows antfu's default and is enabled only when a `pnpm-workspace.yaml` is found in the current directory or an ancestor. UnoCSS and external formatter integrations remain opt-in.

## Optional integrations

This package provides the UnoCSS, Vue accessibility, formatter, and antislop plugins. Vue accessibility and antislop are enabled by default; UnoCSS and formatters require explicit activation through antfu options; shadcn remains registered without enabling all its rules.

The package disables `sonarjs/no-commented-code` to allow optional code examples in comments, while retaining other antislop checks. Override it through `antislop.overrides` or `rules`.

See [extension capabilities](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/docs/src/eslint/presets.md#按需扩展) for purpose, scope, defaults, and configuration. UnoCSS checks utilities; Vue accessibility checks templates; formatters handle layout; antislop checks code and comment quality; shadcn enforces Tailwind v4 design-system contracts.

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Enable UnoCSS utility sorting and attributify checks; disabled by default.
  unocss: true,
  // Format HTML only; leave styles and Markdown to their dedicated tools.
  formatters: { html: true, css: false, markdown: false },
})
```

## Complete configuration

The following configuration retains language defaults, explicitly shows common integration switches, adds a project ignore, and overrides a rule and reporting options. It does not force pnpm on: detection still depends on whether `pnpm-workspace.yaml` exists. Use `zzjtnb()` when only the defaults are needed. Integration fields follow antfu rather than a package-specific option model.

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Integrations forwarded to @antfu/eslint-config.
  typescript: true,
  // Configure Vue; false disables it, true or an object enables or customizes it.
  vue: true,
  // Configure JSON/JSONC; false disables it, true or an object enables or customizes it.
  jsonc: true,
  // Configure YAML; false disables it, true or an object enables or customizes it.
  yaml: true,
  // Configure TOML; false disables it, true or an object enables or customizes it.
  toml: true,
  // Configure Markdown; false disables it, true or an object enables or customizes it.
  markdown: true,
  // Configure Node.js; false disables it, true or an object enables or customizes it.
  node: true,

  // Keep antfu stylistic rules. Set this to false when another formatter owns formatting.
  stylistic: true,
  // Configure UnoCSS; false disables it, true or an object enables or customizes it.
  unocss: false,
  // Configure external formatters; this does not enable ESLint CLI --fix.
  formatters: false,

  // This array is appended to antfu's resolved ignore list.
  ignores: ['generated/**'],

  // These rules override all shared defaults by rule name.
  rules: {
    // Override the severity of console diagnostics.
    'no-console': 'warn',
  },

  // These are native ESLint Flat Config linter options.
  linterOptions: {
    // Report unused eslint-disable directives at this severity.
    reportUnusedDisableDirectives: 'warn',
    // Report unused inline rule configurations at this severity.
    reportUnusedInlineConfigs: 'warn',
  },
})
```

To append another native Flat Config fragment, pass it after the first argument:

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    // Configure stylistic; false disables it, true or an object enables or customizes it.
    stylistic: false,
  },
  {
    // Apply this configuration block only to matching files.
    files: ['scripts/**/*.ts'],
    // Override listed rules and inherit all other rules.
    rules: {
      // Override the severity of console diagnostics.
      'no-console': 'off',
    },
  },
)
```

## TypeScript and NestJS

Your project can keep its own TypeScript version. This package provides TypeScript 6 for the ESLint parser; it does not replace your project compiler. New language features still require support from the installed typescript-eslint version.

For NestJS, configure decorator options for NestJS files. Type-aware linting can also read these options from tsconfig. See [NestJS setup](https://lint.docs.zzjtnb.com/eslint/configuration#nestjs-装饰器与依赖注入).

## Customize the configuration

Use the first argument for language options, global rules, and ignored paths. To target specific files, pass a later configuration object with `files`; do not put `files` in the first argument. Later arguments also accept arrays, asynchronous configurations, and antfu `FlatConfigComposer` instances.

| Input | Behavior |
| --- | --- |
| `typescript`, `vue`, `jsonc`, `yaml`, `toml`, `markdown`, `node`, `stylistic`, `unocss`, `formatters` and other antfu fields | Forwarded to `@antfu/eslint-config` without renaming or rewrapping |
| `pnpm` | Forwarded to antfu; only trustPolicy enforcement and exact-version catalog duplicate detection differ |
| `rules` | Applied after all shared defaults, including JavaScript, TypeScript, Vue and TOML rules; later Flat Config fragments still take precedence |
| `linterOptions` | Native ESLint reporting options, applied without a file restriction; later matching fragments may override them |
| `imports` | Antfu import integration switch and object options; use `imports.overrides` for rule overrides, not `overrides.imports` |
| `ignores` | Arrays append to default ignores; a callback receives the defaults and determines the final result |
| `defaultIgnores` | An array replaces the package list; `false` takes over upstream and package defaults supplied through this option, without disabling the separate `.gitignore` integration |
| Later Flat Config fragments | Passed to antfu after the package's generated fragments; ESLint resolves their order and precedence |

Options use the same names as antfu. To change one language, use its `overrides` option. To change rules globally, use the first argument’s `rules`. Later configuration arguments take precedence. Global rules may also replace declaration-file exceptions, so prefer `vue.overrides` or another language-specific option when changing only that language.

### Native Node.js tests

The test integration disables `test/no-import-node-test` by default, preserving imports from `node:test` instead of rewriting them to Vitest. Other upstream test rules remain active. Consumers can override this through `test.overrides`, first-argument `rules`, or later matching Flat Config fragments. `test: false` disables the test integration.

### Formatting ownership

This package enables antfu stylistic rules by default. If Oxfmt, Prettier or another formatter is the single formatting owner, disable the ESLint formatting rules at the configuration boundary:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Configure stylistic; false disables it, true or an object enables or customizes it.
  stylistic: false,
})
```

`stylistic: false` disables the stylistic rule integration. `stylistic: { semi: true }` keeps the integration enabled and changes only the `semi` option; these two values are not equivalent. Disabling stylistic does not disable sorting or other fixes from independent import, JSON, or YAML integrations. Assign ownership for actual conflicts when migrating formatters.

External formatter integration is separate from stylistic rules. This package provides `eslint-plugin-format`; no extra installation is required. Enable it explicitly through `formatters`:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Configure external formatters; this does not enable ESLint CLI --fix.
  formatters: {
    // Configure CSS; false disables it, true or an object enables or customizes it.
    css: true,
  },
})
```

For the complete formatter and stylistic option set, use the installed antfu version's [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) and its customization documentation.

### UnoCSS

UnoCSS checks are opt-in. This package already provides the ESLint plugin; enable the integration when your project uses UnoCSS:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Configure UnoCSS; false disables it, true or an object enables or customizes it.
  unocss: true,
})
```

### pnpm workspace

The `pnpm` object is owned by antfu, so its fields, defaults, parser registration and sorting behavior follow the installed antfu version. The package removes only trustPolicy from the upstream enforced settings; all other upstream settings and fixes remain unchanged. Catalog duplicate detection uses `checkDuplicates: 'exact-version'`, allowing named catalogs to carry different supported versions while reporting identical package/version declarations.

- Without `pnpm`, antfu enables the integration only when `pnpm-workspace.yaml` exists in the current directory or an ancestor, so npm and yarn projects need no setting.
- `pnpm: true` forces the integration on; it requires a `pnpm-workspace.yaml`, otherwise ESLint reports an error while loading `pnpm/*` rules for `package.json`.
- `pnpm: false` disables the antfu pnpm integration.
- `pnpm: { yaml: false, sort: false }` keeps pnpm package.json checks and disables pnpm-specific YAML integration and sorting. General YAML integration may still check and format the file. Top-level `yaml: false` supplies the pnpm YAML default, while explicit `pnpm.yaml` takes precedence. Use `ignores` to exclude the file completely.
- Other pnpm fields should be checked against the installed antfu version rather than copied into package-specific types.

Use object options only when the consuming project has `pnpm-workspace.yaml` and explicit control is needed:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Configure pnpm workspace checks; false disables this integration.
  pnpm: {
    // Enable pnpm package.json checks; general JSONC configuration remains separate.
    json: true,
    // Configure YAML; false disables it, true or an object enables or customizes it.
    yaml: true,
    // Enable sorting within the pnpm workspace integration.
    sort: true,
  },
})
```

### Ignore behavior

Temporary `.tmp` directories and generated `.codegraph` indexes are ignored at every level; no project-level exclusion is needed.

Antfu's original ignore list remains active during the normal path. This package adds only project-independent generated-output and resource patterns such as `dist-*`, `*-dist`, Nitro output, `.wrangler`, `releases`, `backup` and the entire `src-tauri` directory, snapshots and font files. It does not ignore scripts, tests, CI configuration or repository-specific directories.

Use `ignores` for repository-specific paths:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Exclude matching paths using the tool configuration root.
  ignores: ['generated/**', 'vendor/**'],
})
```

Use `defaultIgnores: false` only when the consumer must define the complete ignore result:

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // Control shared ignore defaults separately from project additions.
  defaultIgnores: false,
  // Exclude matching paths using the tool configuration root.
  ignores: ['node_modules/**', 'dist/**'],
})
```

`defaultIgnores: false` delegates this option's ignore result to the consumer: an `ignores` array becomes the result without automatically including upstream or package defaults; an `ignores` callback goes directly to antfu without injecting the package list. This does not disable antfu's separate `.gitignore` integration or control later fragments and ESLint's own ignore behavior.

`defaultIgnores: [...]` replaces only the package list while retaining antfu defaults. On the normal path, an `ignores` callback receives the merged upstream and package list and determines the result. With `defaultIgnores: false`, the callback handles the list supplied by antfu itself.

The entire `src-tauri` directory is excluded by default, together with `.nuxt`, `.wrangler`, `releases` and `backup`; unrelated `target` or `gen` directories remain eligible.

Each factory call owns the nested options of the rules added by this package, so modifying one result does not change those defaults in later calls. Only package-owned data is copied, not consumer inputs or upstream plugin implementations.

Declaration files (`.d.ts`, `.d.mts`, `.d.cts`) retain upstream `no-restricted-syntax` exemptions, including `export =` required to describe third-party CommonJS modules. Implementation files inherit upstream syntax selectors; this package only changes their severity to warn.

## Default rules

Omit extensions when your toolchain supports it. Otherwise use the actual source extension: do not reference a nonexistent `module.js` when the source is `module.ts`. The `zzjtnb/import-extensions` rule detects this mismatch and permits real JavaScript files. See [NodeNext import setup](https://lint.docs.zzjtnb.com/eslint/configuration#模块导入与源码扩展名).

The package does not duplicate antfu's sorting implementation. Import / export sorting, package.json sorting, tsconfig sorting, pnpm workspace sorting and perfectionist sorting continue to come from antfu.

The package allows ESM top-level `await` by default (`antfu/no-top-level-await: off`); consumers can enable the restriction when needed. The package reports console use, undefined variables, restricted syntax, chaining, list newlines, control-flow braces, if newlines, and top-level function conventions as warnings. Vue rules follow upstream defaults; Vue accessibility and antislop are enabled by default. Warning severity does not disable automatic fixes. The exact rule map is shipped with the package and can be overridden through the `rules` field. First-argument `rules` are high-priority global overrides and can replace language and declaration-file exemptions. Prefer the owning integration, such as `javascript.overrides`, `vue.overrides`, or `imports.overrides`, when changing only one integration.

TOML overrides `toml/spaced-comment` to preserve `#:schema <URL>` directives. Ordinary JavaScript comment-spacing rules remain active.

## API

The package has one runtime export and four type exports:

| Export | Kind | Purpose |
| --- | --- | --- |
| `zzjtnb` | Function | Creates the ESLint configuration used by export default |
| `ESLintConfigOptions` | Type | Type of the first factory argument, including `defaultIgnores` |
| `ESLintUserConfig` | Type | Type of later Flat Config fragments accepted by the factory |
| `ESLintPnpmOptions` | Type | Object form of antfu's `pnpm` options |
| `ESLintStylisticOptions` | Type | Object form of antfu's `stylistic` options |

The package has no default runtime export. Import `zzjtnb` as a named export.

## VS Code

Merge this example into the consuming project's `.vscode/settings.json`, preserving existing settings. It disables overlapping save-time formatting and runs ESLint fixes on explicit saves. Adjust validated languages to the integrations the project actually uses:

```jsonc
{
  // Disable the Prettier extension to avoid competing formatters.
  "prettier.enable": false,
  // Use explicit fix actions instead of also running a save formatter.
  "editor.formatOnSave": false,
  // Run these fix actions on explicit saves only.
  "editor.codeActionsOnSave": {
    // Apply ESLint fixes on explicit saves, not autosave.
    "source.fixAll.eslint": "explicit",
    // Avoid a separate editor import organizer competing with ESLint.
    "source.organizeImports": "never",
  },
  // Change editor diagnostic presentation without disabling rules or fixes.
  "eslint.rules.customizations": [
    {
      // Select diagnostics by rule name or pattern.
      "rule": "style/*",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "format/*",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*-indent",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*-spacing",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*-spaces",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*-order",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*-dangle",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*-newline",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*quotes",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
    {
      // Select diagnostics by rule name or pattern.
      "rule": "*semi",
      // Hide these editor diagnostics; CLI rule severity remains unchanged.
      "severity": "off",
      // Apply this display override only to fixable diagnostics; fixes remain available.
      "fixable": true,
    },
  ],
  // Enable ESLint validation for these editor language modes.
  "eslint.validate": ["javascript", "typescript", "vue", "json", "jsonc", "yaml", "toml"],
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

### Script fields

The package.json example uses strict JSON. Its fields have the following roles:

| Field | Purpose |
| --- | --- |
| `scripts` | Declare commands invoked through pnpm run. |
| `scripts.lint` | Check the selected files without requesting automatic fixes. |
| `scripts.format` | Reuse the check command with --fix to write supported fixes. |

`--fix`, `--cache` and `--cache-location` are ESLint CLI options. The shareable config does not turn on file writes or caching implicitly. Errors fail the command by default; warnings do not. See the [CLI policy guide](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/docs/src/eslint/configuration.md#cli-检查与修复) for the optional zero-warning policy.

## References

- [antfu/eslint-config customization](https://github.com/antfu/eslint-config#customization)
- [antfu/eslint-config options](https://github.com/antfu/eslint-config/blob/main/src/types.ts)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
