# @zzjtnb/markdownlint-config

[![@zzjtnb/markdownlint-config version](https://npmx.dev/api/registry/badge/version/@zzjtnb/markdownlint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![License](https://npmx.dev/api/registry/badge/license/@zzjtnb/markdownlint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![Monthly downloads](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/markdownlint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>Shared Markdownlint rules with native extends support</strong></p>

<p align="center"><strong>English</strong> | <a href="https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/README.zh-CN.md">简体中文</a></p>

## Overview

Consistent Markdown headings, lists, links, and formatting. Use markdownlint-cli2 to check files and apply supported fixes, or load only the rules in your editor.

[Documentation](https://lint.docs.zzjtnb.com/markdownlint)

## Requirements and installation

| Usage | Requirements |
| --- | --- |
| Command-line checks and fixes | Node.js 22 or later, markdownlint-cli2 0.24.x |
| Editor-only rules | Install this package and load its rules in your editor |

Command-line examples use Markdownlint 0.42.x. CLI2 is an optional peer: install it for command-line use; editor-only rule inheritance does not require it.

```bash
# Install Markdownlint and the shared configuration.
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

## Shared CLI configuration

Use `.markdownlint-cli2.mjs` with the `/config` ESM entry to inherit shared scan options and rules. The root export provides JSONC rule configuration.

```js
// .markdownlint-cli2.mjs: reuse shared scanning defaults and rules.
export { default } from '@zzjtnb/markdownlint-config/config'
```

The shared CLI configuration excludes `node_modules`, `dist`, `build`, `backup`, `.codegraph`, `.tmp`, `.output`, `.git`, `.cache`, `.nuxt`, `.wrangler`, `releases` and the entire `src-tauri` directory. To add project-specific patterns, spread `config.ignores`; do not copy the defaults. Rules-only JSONC `extends` does not carry CLI scan settings.

## Rules-only JSONC alternative

Create `.markdownlint-cli2.jsonc` in the project root. See the [CLI2 configuration contract][cli2-config] for the complete field definitions:

```jsonc
{
  // Read project .gitignore rules in addition to the explicit ignores below.
  "gitignore": true,
  // Exclude dependencies and build output; append project-generated paths as needed.
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // Markdownlint rules belong here; CLI2 execution fields stay outside this object.
  "config": {
    // Resolve the installed shared package, then add local rule overrides below.
    "extends": "@zzjtnb/markdownlint-config",
  },
}
```

CLI2 and the VS Code Markdownlint extension both read this configuration. Rule-only files such as `.markdownlint.jsonc` can put `extends` directly in their root object. Do not put CLI2 fields such as `gitignore`, `ignores`, or `customRules` inside that rules object.

A `.markdownlint.*` rule file in the same directory overrides CLI2's `config` property. If rules appear inactive after migration, check whether an old file still supplies another rule set. Do not split shared rules and local overrides across competing rule sources.

## Complete configuration and customization

```jsonc
{
  // Combine Git ignore rules with project-specific paths below.
  "gitignore": true,
  // The consuming project owns the scope, including generated documentation.
  "ignores": ["**/node_modules/**", "**/dist/**", "docs/generated/**"],
  // Load project rules relative to this file, or use installed rule-package names.
  "customRules": ["./lint-rules/no-todo.js"],
  // Inherit shared defaults before applying same-named local overrides.
  "config": {
    // Markdownlint resolves the package's JSONC entry natively.
    "extends": "@zzjtnb/markdownlint-config",
    // MD013: enable line-length checks with a normal-line threshold of 120 characters.
    "MD013": { "line_length": 120 },
    // MD024: false checks duplicate headings throughout the document, not only siblings.
    "MD024": { "siblings_only": false },
    // MD033: allow line breaks and collapsible sections using an explicit tag list.
    "MD033": { "allowed_elements": ["br", "details", "summary"] },
    // This rule must first be loaded through customRules before it can be configured.
    "project-no-todo": true,
  },
}
```

Default values, their purposes, and official option references are maintained in the published [`index.jsonc`][rules]. For built-in rule overrides only, omit `customRules` and `project-no-todo` without creating a rule module.

For an ESM project, `lint-rules/no-todo.js` can contain:

```js
export default {
  // Declare the rule name used by configuration and diagnostics.
  names: ['project-no-todo'],
  // Describe the document convention checked by this rule.
  description: 'Disallow unfinished TODO: markers in documentation',
  // Assign rule categories for discovery and reporting.
  tags: ['project'],
  // Use the parser expected by the custom rule.
  parser: 'none',
  // Inspect document lines and report issues without mutating the input.
  function(params, onError) {
    params.lines.forEach((line, index) => {
      const column = line.indexOf('TODO:')
      if (column !== -1) {
        onError({
          // Report one-based source line numbers.
          lineNumber: index + 1,
          // Explain the reason for this diagnostic.
          detail: 'Complete or remove the TODO marker',
          // Report the starting column and length using Markdownlint conventions.
          range: [column + 1, 5],
        })
      }
    })
  },
}
```

This rule checks raw text, including code blocks, and reports the first `TODO:` marker on each line. Follow the [custom rule contract][custom-rules] and select `micromark` when structured tokens are needed. Outside an ESM project, use an `.mjs` rule file and update `customRules` accordingly.

## Default rules and merge behavior

Markdownlint rules are enabled by default. See [`index.jsonc`][rules] for every adjustment, explanation, and official rule reference.

Native `extends` loads shared values before local overrides. A local option replaces the entire shared rule option object, without a field-by-field deep merge. Custom rule implementations must be loaded through `customRules`; they are not embedded in the shared JSONC.

## VS Code integration

Install `DavidAnson.vscode-markdownlint`. It reads the project's `.markdownlint-cli2.jsonc`, so do not duplicate the rules in `settings.json`.

Merge these fields into `.vscode/settings.json`, preserving existing ESLint, Stylelint, and other save actions:

```jsonc
{
  // Save actions control when fixes run; project CLI2 configuration owns the rules.
  "editor.codeActionsOnSave": {
    // Cover both explicit saves and Auto Save.
    "source.fixAll.markdownlint": "always",
  },
  // Scope formatter settings to Markdown rather than changing other languages.
  "[markdown]": {
    // Use Markdownlint for manual and paste formatting.
    "editor.defaultFormatter": "DavidAnson.vscode-markdownlint",
    // fixAll already handles saving; do not run a second formatting path.
    "editor.formatOnSave": false,
    // Use the selected formatter when pasting.
    "editor.formatOnPaste": true,
  },
}
```

The [extension documentation][vscode-config] deprecates `markdownlint.config`. Project configuration takes precedence over global settings. `markdownlint.lintWorkspaceGlobs` only controls the extension's lint-workspace command; it does not replace CLI2 globs or ignores.

## Direct Markdownlint API usage

The core `readConfig` API defaults to `JSON.parse`. Pass a JSONC parser when reading a commented configuration directly. CLI2 and the VS Code extension provide one automatically:

```js
import { createRequire } from 'node:module'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'

const configPath = createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config')
const config = await readConfig(configPath, [jsoncParse])
const results = await lint({
  config,
  // Check Markdown strings by virtual filename without scanning disk.
  strings: {
    // Check this string as sample.md and index results by that name.
    'sample.md': '# Example\n',
  },
})
```

## Commands and migration

```bash
# Check without requesting writes.
pnpm exec markdownlint-cli2 --config .markdownlint-cli2.jsonc "**/*.md"

# Request automatic fixes; remaining issues still need manual changes.
pnpm exec markdownlint-cli2 --config .markdownlint-cli2.jsonc --fix "**/*.md"
```

Or save project scripts that reuse the same file-selection arguments:

```json
{
  "scripts": {
    "lint:markdownlint": "markdownlint-cli2 --config .markdownlint-cli2.jsonc \"**/*.md\"",
    "format:markdownlint": "pnpm run lint:markdownlint --fix"
  }
}
```

### Script fields

The package.json example uses strict JSON. Its fields have the following roles:

| Field | Purpose |
| --- | --- |
| `scripts` | Declare commands invoked through pnpm run. |
| `scripts.lint:markdownlint` | Check the selected files without requesting automatic fixes. |
| `scripts.format:markdownlint` | Reuse the check command with --fix to write supported fixes. |

CLI2's top-level `fix` setting can also enable or prevent writes and overrides the default supplied by `--fix`. To keep checking and fixing separate, do not pin `fix: true` or `fix: false` in the shared local CLI2 configuration.

The package does not enable automatic fixes. Preserve existing `gitignore`, `ignores`, `globs`, custom rules, and output settings when migrating. Replace only duplicated rule defaults with `config.extends`.

ESLint's Markdown integration can also check code blocks. Use `zzjtnb({ markdown: false })` when Markdownlint owns Markdown checking for the project; this also disables ESLint's Markdown code-block checks, which Markdownlint does not replace.

## License

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE).

[cli2-config]: https://github.com/DavidAnson/markdownlint-cli2/blob/v0.24.0/README.md#configuration
[custom-rules]: https://github.com/DavidAnson/markdownlint/blob/v0.42.0/doc/CustomRules.md
[vscode-config]: https://github.com/DavidAnson/vscode-markdownlint/blob/v0.62.1/README.md#configure
[rules]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/index.jsonc
