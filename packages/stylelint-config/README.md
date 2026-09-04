# @zzjtnb/stylelint-config

[![@zzjtnb/stylelint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/stylelint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![许可证](https://npmx.dev/api/registry/badge/license/@zzjtnb/stylelint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![月下载量](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/stylelint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>Stylelint config for modern CSS, SCSS, Vue SFC, UnoCSS and Tailwind-style workflows</strong></p>

<p align="center"><strong>English</strong> | <a href="./README.zh-CN.md">简体中文</a></p>

## Scope

`@zzjtnb/stylelint-config` is an opinionated Stylelint shareable config with the same factory entry style as `@zzjtnb/eslint-config`.

- `zzjtnb()` creates a complete Stylelint `Config` object.
- The shared defaults, rules and syntax-specific overrides are composed in one package entry.
- Stylelint, CLI and PostCSS dependencies keep their normal ownership boundaries.
- The package uses the published Stylelint field names directly: `extends`, `plugins`, `ignoreFiles`, `rules`, `overrides`, `languageOptions`, `cache` and `fix`.

Stylelint configuration is object-based rather than ESLint's Flat Config array. The factory therefore returns a `Config` object, and the package also keeps a default export of `zzjtnb()` for Stylelint's native `extends` resolution.

## Requirements and installation

| Package | Version |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| Stylelint | `^17.12.0` |

The package is ESM-only. Prefer `stylelint.config.ts`; use `stylelint.config.js` in an ESM project or `stylelint.config.mjs` otherwise.

```bash
pnpm add -D stylelint @zzjtnb/stylelint-config
```

## Minimal configuration

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

The native shareable-config form remains available when a project does not need a local factory call:

```ts
// stylelint.config.ts
export default {
  extends: ['@zzjtnb/stylelint-config'],
}
```

Both forms support local `rules`, `ignoreFiles`, and `overrides`. The factory appends lists and applies rules in this package's defined order; native `extends` uses Stylelint's inheritance semantics. Do not assume identical override precedence.

## Complete configuration

The following file is a complete, copyable example. It adds repository-specific ignored files, overrides two shared rules, and adds a syntax-scoped override without replacing the shared presets or parser configuration.

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // These paths are appended to the shared absolute ignore paths.
  ignoreFiles: [
    '**/generated/**',
    '**/public/vendor/**',
  ],

  // A same-named consumer rule replaces the shared value.
  rules: {
    'selector-class-pattern': null,
    'no-empty-source': true,
  },

  // This override is appended after the package's HTML, Vue and SCSS overrides.
  overrides: [
    {
      files: ['apps/legacy/**/*.vue'],
      rules: {
        'no-empty-source': null,
      },
    },
  ],
})
```

A complete Stylelint config fragment can be passed after the first argument. This is useful when a project keeps a reusable local config fragment separate from the shared defaults:

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  { rules: { 'no-empty-source': true } },
  {
    ignoreFiles: ['**/vendor/**'],
    rules: {
      'color-no-invalid-hex': true,
    },
  },
)
```

## Configuration behavior

The first argument is `Partial<Config>` from Stylelint. Later arguments are complete Stylelint `Config` fragments. The factory starts with the package defaults and processes the first argument followed by each later fragment.

| Config field | Merge behavior |
| --- | --- |
| `rules` | Shallow merge by rule name; a later value replaces an earlier value for the same rule |
| `extends` | Append values from each config in order |
| `plugins` | Append values from each config in order |
| `ignoreFiles` | Append values from each config in order |
| `overrides` | Append override objects in order |
| All other fields, including `languageOptions` | The later config replaces the earlier value |

The merge is not a deep merge. For example, supplying `languageOptions` replaces the complete shared `languageOptions` object; it does not merge only one nested syntax property. Rules are merged only at the top level by rule name.

## Defaults

### Presets and plugins

The default configuration extends:

- `stylelint-config-standard` for the shared CSS rules;
- `stylelint-config-recess-order` for property ordering;
- `stylelint-config-recommended-vue/scss` in the Vue scope;
- `stylelint-config-recommended-scss` in the SCSS scope.

The recess-order preset registers `stylelint-order`; the SCSS and Vue presets register `stylelint-scss` in their file scopes. The package declares the required dependencies and resolves preset entries from its own dependency context, without registering the same plugins again. Consumers do not need to install these implementation dependencies separately.

### Syntax scopes

| File scope | Parser / extensions | Rules |
| --- | --- | --- |
| `*.css` | Stylelint default CSS syntax | Shared CSS rules and CSS-specific adjustments |
| `*.html`, `*.htm` | `postcss-html` | Shared CSS rules and CSS-specific adjustments |
| `*.vue` | `postcss-html`, Vue SCSS preset | Shared CSS rules plus `scss/*` rules |
| `*.scss` | `postcss-scss`, SCSS preset | Shared CSS rules plus `scss/*` rules |

Top-level `rules` take precedence over presets inherited inside file overrides. CSS / HTML-only rules stay in their own file scopes, so they do not re-enable rules disabled by the SCSS preset. Factory `rules` apply after shared file-scoped defaults, followed by that argument's `overrides`; subsequent arguments follow the same order.

SCSS plugin rules are registered only inside the `.scss` and `.vue` overrides. Ordinary CSS files therefore do not receive `Unknown rule` errors for SCSS rules.

Vue scoped styles can use `:deep()`, `:global()`, and `:slotted()` without repeating their exceptions in each project. Other unknown pseudo-classes are still reported.

### At-rules and units

The shared configuration supports utility-first directives such as `@apply`, `@layer`, `@theme`, `@screen`, `@custom-variant`, and `@container-queries`, and registers `rpx` as a CSS length unit. Stylelint already recognizes `@apply` and `@layer`, so the package does not register them again. CSS / HTML additionally exempt utility-style `@apply` parameters from prelude validation.

CSS registers utility directives through `languageOptions.syntax.atRules`; the SCSS plugin receives the same names as exceptions. Built-in Sass directives are handled by the official SCSS preset rather than registered as CSS extensions.

### Default rules

The package keeps the standard and recess-order presets, then explicitly relaxes rules that conflict with the repository's CSS, Vue, SCSS or utility-first conventions. Examples include unknown utility at-rules and functions, generic font-family requirements, descending specificity, empty source files, selected selector restrictions and some declaration-position checks.

The effective rules include both inherited presets and file-scoped adjustments. Use `pnpm exec stylelint --config stylelint.config.ts --print-config <file>` to inspect the final configuration for a specific file. Use the `rules` field to replace a rule by name rather than copying the complete shared map.

### Execution and reporting

The following Stylelint config fields default to the shown values:

| Field | Default | Meaning |
| --- | --- | --- |
| `allowEmptyInput` | `true` | A glob that matches no files does not fail the run |
| `cache` | `false` | Stylelint does not use its cache unless the consumer enables it |
| `fix` | `false` | Stylelint does not write fixes unless the consumer enables it |
| `reportDescriptionlessDisables` | `[true, { severity: 'warning' }]` | Warn about `stylelint-disable` comments without a description |
| `reportInvalidScopeDisables` | `[true, { severity: 'warning' }]` | Warn about disable comments whose rule scope is invalid |
| `reportNeedlessDisables` | `[true, { severity: 'warning' }]` | Warn about disable comments that are no longer needed |
| `reportUnscopedDisables` | `[true, { severity: 'warning' }]` | Warn about disable comments that do not name a rule |

Caching and file writes are controlled by the consumer's CLI flags or local config. The shareable config does not enable either behavior implicitly. `allowEmptyInput: true` permits zero matches; it does not establish that the target file was checked. Set `allowEmptyInput: false` when zero matches must fail.

### Default ignores

The shared default `ignoreFiles` list includes:

- `node_modules`, `dist`, `build`, `.nuxt`, `.turbo`, `.vercel`, `.wrangler` and `coverage`;
- JavaScript, TypeScript, JSON and Markdown files, which should be checked by their respective linters.

Each factory call generates paths from its current working directory; the default object used by native `extends` is generated at module load. Paths are absolute so a shared config does not accidentally resolve its ignore globs relative to the package directory. Add repository-specific paths through the factory's `ignoreFiles` field; the values are appended to the shared list. Tauri defaults exclude `src-tauri/target` and `src-tauri/gen`, including generated schemas and Android / Apple projects, without excluding unrelated `target` or `gen` directories; handwritten resources such as `src-tauri/resources` remain checked. Append custom output directories through `ignoreFiles`.

The factory always appends `ignoreFiles`; an empty array does not remove shared ignores. To take over the list completely, override `ignoreFiles` on the returned object and retain necessary dependency and generated-output exclusions yourself.

## CLI scripts

Use a style-bearing glob rather than `stylelint .`, because Stylelint config files do not provide ESLint Flat Config's `files` allowlist:

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html,htm}\" --config stylelint.config.ts --cache --cache-location node_modules/.cache/.stylelintcache",
    "format:stylelint": "pnpm run lint:stylelint --fix"
  }
}
```

`--cache`, `--cache-location` and `--fix` are Stylelint CLI options. The CLI flags override the corresponding shared defaults for that run.

## Public exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `zzjtnb` | Function | Creates a Stylelint `Config` object |
| `default` | Runtime value | The result of `zzjtnb()`, for native Stylelint loading and `extends` |
| `Config` | Type | The native `Config` type re-exported from `stylelint` |

`Config` is the Stylelint type itself; this package does not wrap it in a package-specific `Options` or `StylelintConfig` alias.

## VS Code

Merge this example into the consuming project's `.vscode/settings.json`, preserving save actions for other languages. Let Stylelint own style diagnostics and fixes, and disable duplicate built-in CSS / SCSS / Less validation:

```json
{
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false,
  "stylelint.packageManager": "pnpm",
  "stylelint.validate": ["css", "scss", "vue", "html"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": "explicit",
    "source.organizeImports": "never"
  }
}
```

## Notes

- TypeScript and JavaScript configurations can call `zzjtnb()` or export a native object containing `extends`; choose based on the required merge semantics.
- A same-named rule replaces the shared rule; options inside one rule are not deep-merged.
- A custom `languageOptions` object replaces the complete shared language model, including the `rpx` unit and at-rule exceptions.
- Stylelint owns CSS, SCSS, Vue and HTML styles. JavaScript, TypeScript and Markdown should be handled by their respective linters.

## Official references

- [Stylelint configuration](https://stylelint.io/user-guide/configure/)
- [Stylelint CLI](https://stylelint.io/user-guide/cli/)
- [Stylelint rules](https://stylelint.io/user-guide/rules/)

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
