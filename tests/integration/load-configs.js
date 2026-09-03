import assert from 'node:assert/strict'
import process from 'node:process'

import * as eslintConfigModule from '@zzjtnb/eslint-config'
import { zzjtnb } from '@zzjtnb/eslint-config'
import * as stylelintConfigModule from '@zzjtnb/stylelint-config'
import stylelintConfig, { zzjtnb as createStylelintConfig } from '@zzjtnb/stylelint-config'

async function main() {
  assert.deepEqual(Object.keys(eslintConfigModule), ['zzjtnb'], 'eslint runtime API should expose only zzjtnb')
  assert.deepEqual(
    Object.keys(stylelintConfigModule),
    ['default', 'zzjtnb'],
    'stylelint runtime API should expose the config and zzjtnb factory',
  )
  const eslintResult = zzjtnb({
    unocss: false,
    vue: false,
  })
  const eslintFlatConfig = await eslintResult
  const eslintConfigNames = eslintFlatConfig.map(config => config.name).filter(Boolean)
  assert.ok(eslintResult, '@zzjtnb/eslint-config should return an ESLint flat config promise')
  assert.ok(eslintConfigNames.includes('antfu/jsonc/setup'), 'eslint config should enable JSON / JSONC support')
  assert.ok(eslintConfigNames.includes('antfu/yaml/setup'), 'eslint config should enable YAML support')
  assert.ok(eslintConfigNames.includes('antfu/toml/setup'), 'eslint config should enable TOML support')
  assert.equal(eslintConfigNames.includes('antfu/stylistic/rules'), true)
  assert.equal(eslintConfigNames.includes('antfu/perfectionist/setup'), true)
  assert.equal(eslintConfigNames.includes('antfu/markdown/setup'), true)
  const externalFormatterConfigNames = (await zzjtnb({ stylistic: false }))
    .map(config => config.name)
    .filter(Boolean)
  assert.equal(externalFormatterConfigNames.includes('antfu/stylistic/rules'), false)
  assert.equal(externalFormatterConfigNames.includes('antfu/perfectionist/setup'), true)

  const antfuIgnores = eslintFlatConfig.find(config => config.name === 'antfu/ignores')?.ignores ?? []
  assert.equal(antfuIgnores.includes('**/dist'), true)
  assert.equal(antfuIgnores.includes('**/*.?([cm])ts'), false)
  assert.equal(antfuIgnores.includes('**/*.?([cm])tsx'), false)
  assert.equal(eslintFlatConfig.some(config => config.name === 'antfu/typescript/rules'), true)
  const strictRules = await zzjtnb({
    ignores: ['generated/**'],
    pnpm: false,
    rules: { 'no-console': 'error' },
  })
  assert.ok(
    strictRules.some(config => config.rules?.['no-console'] === 'error'),
    'consumer rules should be forwarded to antfu',
  )
  assert.equal(
    strictRules.some(config => config.rules?.['pnpm/yaml-enforce-settings']),
    false,
    'consumer should be able to disable pnpm workspace rules',
  )
  assert.deepEqual(
    strictRules.find(config => config.name === 'antfu/ignores')?.ignores?.includes('generated/**'),
    true,
    'consumer ignore patterns should be forwarded to antfu unchanged',
  )
  const packageJsonOnlyPnpm = await zzjtnb({
    pnpm: { sort: false, yaml: false },
  })
  assert.equal(
    packageJsonOnlyPnpm.some(config => config.name === 'antfu/pnpm/pnpm-workspace-yaml'),
    false,
    'pnpm.yaml=false should disable pnpm-workspace.yaml parsing and rules',
  )
  assert.equal(
    packageJsonOnlyPnpm.some(config => config.name === 'antfu/pnpm/package-json'),
    true,
    'pnpm.yaml=false should retain package.json checks',
  )
  const pnpmWithoutCatalogs = await zzjtnb({ pnpm: { catalogs: false } })
  assert.equal(
    pnpmWithoutCatalogs.some(config => config.rules?.['pnpm/json-enforce-catalog']),
    false,
    'pnpm.catalogs=false should be forwarded to antfu unchanged',
  )
  const upstreamPnpmConfig = eslintFlatConfig.findLast(config => config.rules?.['pnpm/yaml-enforce-settings'])
  assert.deepEqual(
    upstreamPnpmConfig?.rules?.['pnpm/yaml-enforce-settings'],
    'off',
    'eslint config should not add pnpm workspace policy settings by default',
  )
  assert.equal(eslintFlatConfig.some(config => config.name === 'antfu/unocss'), false)
  assert.equal(eslintFlatConfig.some(config => config.name?.startsWith('antfu/formatter/')), false)

  const defaultStylelintConfig = createStylelintConfig()
  assert.deepEqual(defaultStylelintConfig, stylelintConfig)
  assert.ok(Array.isArray(stylelintConfig.extends))
  assert.ok(Array.isArray(stylelintConfig.overrides))
  assert.ok(stylelintConfig.rules)
  assert.ok(stylelintConfig.languageOptions?.syntax?.atRules)
  assert.ok(stylelintConfig.languageOptions?.syntax?.units?.length)
  const stylelintExtends = stylelintConfig.extends
  const stylelintOverrides = stylelintConfig.overrides
  const stylelintRules = stylelintConfig.rules
  const stylelintAtRules = stylelintConfig.languageOptions.syntax.atRules
  const stylelintUnits = stylelintConfig.languageOptions.syntax.units
  assert.ok(
    stylelintExtends.some(path => path.endsWith('/stylelint-config-standard/index.js')),
    'stylelint config should include standard CSS rules',
  )
  const stylelintScssOverride = stylelintOverrides.find(override => override.files.includes('*.scss'))
  assert.ok(
    Array.isArray(stylelintScssOverride?.extends)
    && stylelintScssOverride.extends.some(path => path.endsWith('/stylelint-config-recommended-scss/index.js')),
    'stylelint SCSS override should include the recommended SCSS rules',
  )
  assert.ok(
    Array.isArray(stylelintScssOverride?.extends)
    && stylelintScssOverride.extends.some(path => path.endsWith('/stylelint-config-recommended-vue/scss/index.js')),
    'stylelint SCSS override should include the Vue SCSS container rules',
  )

  assert.ok(
    (() => {
      const vueOverride = stylelintOverrides.find(override => override.files.includes('*.vue'))
      return Array.isArray(vueOverride?.extends)
        && vueOverride.extends.some(path => path.endsWith('/stylelint-config-recommended-vue/scss/index.js'))
    })(),
    'stylelint Vue override should include Vue SCSS container rules',
  )

  assert.equal(Object.hasOwn(stylelintRules, 'at-rule-no-unknown'), true)
  assert.equal(Object.hasOwn(stylelintRules, 'unit-no-unknown'), false)
  assert.equal(stylelintAtRules.apply.comment, 'Utility-first framework directive')
  assert.equal(stylelintAtRules['custom-variant'].comment, 'Utility-first framework directive')
  assert.deepEqual(stylelintUnits.length, ['rpx'])
  assert.deepEqual(stylelintConfig.reportNeedlessDisables, [true, { severity: 'warning' }])
  assert.deepEqual(stylelintConfig.reportUnscopedDisables, [true, { severity: 'warning' }])
  assert.deepEqual({
    allowEmptyInput: stylelintConfig.allowEmptyInput,
    cache: stylelintConfig.cache,
    fix: stylelintConfig.fix,
  }, {
    allowEmptyInput: true,
    cache: false,
    fix: false,
  })

  const customStylelintConfig = createStylelintConfig({
    ignoreFiles: ['generated/**'],
    rules: { 'no-empty-source': 'error' },
    overrides: [{ files: ['legacy/**/*.scss'], rules: { 'scss/operator-no-newline-after': 'error' } }],
  })
  assert.ok(customStylelintConfig.ignoreFiles)
  assert.ok(customStylelintConfig.rules)
  assert.ok(customStylelintConfig.overrides)
  assert.equal(customStylelintConfig.ignoreFiles.includes('generated/**'), true)
  assert.equal(customStylelintConfig.rules['no-empty-source'], 'error')
  assert.equal(customStylelintConfig.overrides.some(override => override.files.includes('legacy/**/*.scss')), true)

  process.stdout.write('lint configs loaded\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
