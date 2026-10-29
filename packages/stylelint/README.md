# @zzjtnb/stylelint-config

[![@zzjtnb/stylelint-config version](https://npmx.dev/api/registry/badge/version/@zzjtnb/stylelint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![License](https://npmx.dev/api/registry/badge/license/@zzjtnb/stylelint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![Monthly downloads](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/stylelint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>Stylelint config for modern CSS, SCSS, Vue SFC, UnoCSS and Tailwind-style workflows</strong></p>

<p align="center"><strong>English</strong> | <a href="https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/stylelint/README.zh-CN.md">简体中文</a></p>

## Overview

Check and fix styles in CSS, SCSS, Vue, and HTML. Includes property sorting, Vue selectors, and common utility-framework directives. Override defaults in your project configuration.

[Documentation](https://lint.docs.zzjtnb.com/stylelint)

## Requirements and installation

| Package | Version |
| --- | --- |
| Node.js | `^22.12.0 \|\| >=24` |
| Stylelint | `^17.16.0` |

This ESM-only package uses `stylelint.config.js` with `"type": "module"` in the project package.json. No TypeScript configuration loader is required. Projects without ESM enabled can use `stylelint.config.mjs`.

```bash
# Install Stylelint and the shared configuration.
pnpm add -D stylelint @zzjtnb/stylelint-config
```

## Minimal configuration

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

The native shareable-config form remains available when a project does not need a local factory call:

```js
// stylelint.config.js
export default {
  // Extend the shared configuration, then apply local rule overrides.
  extends: ['@zzjtnb/stylelint-config'],
}
```

Both forms support local `rules`, `ignoreFiles`, and `overrides`. The factory appends lists and applies rules in this package's defined order; native `extends` uses Stylelint's inheritance semantics. Do not assume identical override precedence.

## Complete configuration

The following file is a complete, copyable example. It adds repository-specific ignored files, overrides two shared rules, and adds a syntax-scoped override without replacing the shared presets or parser configuration.

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // These paths are appended to the shared absolute ignore paths.
  ignoreFiles: ['**/generated/**', '**/public/vendor/**'],

  // A same-named consumer rule replaces the shared value.
  rules: {
    // Disable the inherited class naming pattern for this project.
    'selector-class-pattern': null,
    // Control empty-source diagnostics: true enables the rule; null disables it.
    'no-empty-source': true,
  },

  // This override is appended after the package's HTML, Vue and SCSS overrides.
  overrides: [
    {
      // Apply this configuration block only to matching files.
      files: ['apps/legacy/**/*.vue'],
      // Override listed rules and inherit all other rules.
      rules: {
        // Control empty-source diagnostics: true enables the rule; null disables it.
        'no-empty-source': null,
      },
    },
  ],
})
```

A complete Stylelint config fragment can be passed after the first argument. This is useful when a project keeps a reusable local config fragment separate from the shared defaults:

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  {
    // Override listed rules and inherit all other rules.
    rules: {
      // Control empty-source diagnostics: true enables the rule; null disables it.
      'no-empty-source': true,
    },
  },
  {
    // Append project ignore patterns while retaining shared ignores.
    ignoreFiles: ['**/vendor/**'],
    // Override listed rules and inherit all other rules.
    rules: {
      // Validate hexadecimal colors; true enables the rule and null disables it.
      'color-no-invalid-hex': true,
    },
  },
)
```

## Customize the configuration

Each argument to `zzjtnb()` is a Stylelint `Config` object. Set only the fields you need to change. Arguments are merged from left to right; later values for the same rule take precedence.

| Config field | Merge behavior |
| --- | --- |
| `rules` | Shallow merge by rule name; a later value replaces an earlier value for the same rule |
| `extends` | Append values from each config in order |
| `plugins` | Append values from each config in order |
| `ignoreFiles` | Append values from each config in order |
| `overrides` | Append override objects in order |
| All other fields, including `languageOptions` | The later config replaces the earlier value |

For example, `languageOptions` replaces the entire default object, so include any fields you still need. A same-named rule is also replaced as a whole; its parameters are not combined. Global `rules` override the package defaults for each file type. The same argument’s `overrides` then apply, allowing exceptions for selected files.

## Defaults

### Presets and plugins

The default configuration extends:

- `stylelint-config-standard` for the shared CSS rules;
- `stylelint-config-recess-order` for property ordering;
- `stylelint-config-recommended-vue/scss` in the Vue scope;
- `stylelint-config-recommended-scss` in the SCSS scope.

The recess-order preset registers `stylelint-order`; the SCSS and Vue presets register `stylelint-scss` in their file scopes. The package declares the required dependencies and resolves preset entries from its own dependency context, without registering the same plugins again. Consumers do not need to install these implementation dependencies separately.

### Supported file types

The package supplies loaded parser instances, so consumers do not need to install `postcss-html` or `postcss-scss` separately. This applies to both local links and published installations.

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

The package inherits standard and recess-order, retaining only framework syntax, Vue selector extensions, empty-source handling, and block node ordering differences. Other rules follow upstream defaults.

The effective rules include both inherited presets and file-scoped adjustments. Use `pnpm exec stylelint --config stylelint.config.js --print-config <file>` to inspect the final configuration for a specific file. Use the `rules` field to replace a rule by name rather than copying the complete shared map.

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

The shareable config relies on Stylelint’s native cache and fix defaults instead of redeclaring them. Caching and file writes are controlled by the consumer's CLI flags or local config. The shareable config does not enable either behavior implicitly. `allowEmptyInput: true` permits zero matches; it does not establish that the target file was checked. Set `allowEmptyInput: false` when zero matches must fail.

### Default ignores

Directories named `.tmp`, `.output`, `.git`, `.cache`, and `.codegraph` are ignored at every level.

Playwright reports and artifacts in `**/playwright-report/**` and `**/test-results/**` are excluded by default, including nested projects.

Stylelint itself ignores `node_modules` by default. The shared `ignoreFiles` list adds:

- `dist`, `build`, `backup`, `releases`, the entire `src-tauri` directory, `.nuxt`, `.turbo`, `.vercel`, `.wrangler` and `coverage`;
- JavaScript, TypeScript, JSON and Markdown files, which should be checked by their respective linters.

Each factory call generates paths from its current working directory; the default object used by native `extends` is generated at module load. Paths are absolute so a shared config does not accidentally resolve its ignore globs relative to the package directory. Add repository-specific paths through the factory's `ignoreFiles` field; the values are appended to the shared list.

The factory always appends `ignoreFiles`; an empty array does not remove shared ignores. To take over the list completely, override `ignoreFiles` on the returned object and retain necessary dependency and generated-output exclusions yourself.

## CLI scripts

Use a style-bearing glob rather than `stylelint .`, because Stylelint config files do not provide ESLint Flat Config's `files` allowlist:

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html,htm}\" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache",
    "format:stylelint": "pnpm run lint:stylelint --fix"
  }
}
```

### Script fields

The package.json example uses strict JSON. Its fields have the following roles:

| Field | Purpose |
| --- | --- |
| `scripts` | Declare commands invoked through pnpm run. |
| `scripts.lint:stylelint` | Check the selected files without requesting automatic fixes. |
| `scripts.format:stylelint` | Reuse the check command with --fix to write supported fixes. |

`--cache`, `--cache-location` and `--fix` are Stylelint CLI options. The CLI flags override the corresponding shared defaults for that run.

## API

| Export | Kind | Purpose |
| --- | --- | --- |
| `zzjtnb` | Function | Creates a Stylelint `Config` object |
| `default` | Runtime value | The result of `zzjtnb()`, for native Stylelint loading and `extends` |
| `Config` | Type | The native `Config` type re-exported from `stylelint` |

`Config` is the Stylelint type itself; this package does not wrap it in a package-specific `Options` or `StylelintConfig` alias.

## VS Code

Merge this example into the consuming project's `.vscode/settings.json`, preserving save actions for other languages. Let Stylelint own style diagnostics and fixes, and disable duplicate built-in CSS / SCSS / Less validation:

```jsonc
{
  // Disable built-in CSS validation to avoid duplicate diagnostics.
  "css.validate": false,
  // Disable built-in SCSS validation to avoid duplicate diagnostics.
  "scss.validate": false,
  // Disable built-in Less validation to avoid duplicate diagnostics.
  "less.validate": false,
  // Use pnpm to resolve project dependencies in the Stylelint extension.
  "stylelint.packageManager": "pnpm",
  // Validate these style and template languages with Stylelint.
  "stylelint.validate": ["css", "scss", "vue", "html"],
  // Run these fix actions on explicit saves only.
  "editor.codeActionsOnSave": {
    // Apply Stylelint fixes on explicit saves, not autosave.
    "source.fixAll.stylelint": "explicit",
    // Avoid a separate editor import organizer competing with ESLint.
    "source.organizeImports": "never",
  },
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
