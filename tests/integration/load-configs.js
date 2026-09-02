import assert from 'node:assert/strict'
import process from 'node:process'

import eslintDefaultConfig, {
  base,
  defaultFormatters,
  defaultIgnores,
  defaultLinterOptions,
  defaultMarkdown,
  defaultStylistic,
  ruleOverrides,
  rules,
  uno,
  vue,
  zzjtnb,
} from '@zzjtnb/eslint-config'
import stylelintConfig, {
  createStylelintIgnoreFiles,
  stylelintExecutionOptions,
  stylelintIgnoreFiles,
  stylelintLanguageOptions,
  stylelintReportOptions,
  stylelintRules,
  stylelintScssAtRuleOptions,
  stylelintScssRules,
  zzjtnb as stylelintZzjtnb,
} from '@zzjtnb/stylelint-config'

async function main() {
  assert.equal(eslintDefaultConfig, zzjtnb, 'default export should point to zzjtnb')
  assert.equal(stylelintZzjtnb(), stylelintConfig, 'stylelint zzjtnb should return the default config')
  const eslintResult = zzjtnb({
    unocss: false,
    vue: false,
  })
  const eslintFlatConfig = await eslintResult
  const eslintConfigNames = eslintFlatConfig.map(config => config.name).filter(Boolean)
  const eslintBaseResult = base()
  const eslintVueResult = vue()
  const eslintUnoResult = uno()

  assert.ok(eslintResult, '@zzjtnb/eslint-config should return an ESLint flat config promise')
  assert.ok(eslintBaseResult, 'base preset should return an ESLint flat config promise')
  assert.ok(eslintVueResult, 'vue preset should return an ESLint flat config promise')
  assert.ok(eslintUnoResult, 'uno preset should return an ESLint flat config promise')
  assert.ok(eslintConfigNames.includes('antfu/jsonc/setup'), 'eslint config should enable JSON / JSONC support')
  assert.ok(eslintConfigNames.includes('antfu/yaml/setup'), 'eslint config should enable YAML support')
  assert.ok(eslintConfigNames.includes('antfu/toml/setup'), 'eslint config should enable TOML support')
  assert.equal(defaultFormatters, false)
  assert.equal(defaultMarkdown, true)
  assert.equal(defaultStylistic, true)
  assert.equal(eslintConfigNames.includes('antfu/stylistic/rules'), true)
  assert.equal(eslintConfigNames.includes('antfu/perfectionist/setup'), true)
  assert.equal(eslintConfigNames.includes('antfu/markdown/setup'), true)
  const externalFormatterConfigNames = (await zzjtnb({ stylistic: false }))
    .map(config => config.name)
    .filter(Boolean)
  assert.equal(externalFormatterConfigNames.includes('antfu/stylistic/rules'), false)
  assert.equal(externalFormatterConfigNames.includes('antfu/perfectionist/setup'), true)

  assert.deepEqual(defaultIgnores, [])
  const antfuIgnores = eslintFlatConfig.find(config => config.name === 'antfu/ignores')?.ignores ?? []
  assert.equal(antfuIgnores.includes('**/*.?([cm])ts'), false)
  assert.equal(antfuIgnores.includes('**/*.?([cm])tsx'), false)
  assert.deepEqual(defaultLinterOptions, {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  })
  assert.equal(rules['no-console'], 'off')
  assert.equal(ruleOverrides.rules, rules)
  const strictRules = await zzjtnb({
    defaultIgnores: false,
    ignores: ['generated/**'],
    pnpm: false,
    pnpmWorkspace: false,
    rules: { 'no-console': 'error' },
  })
  assert.ok(
    strictRules.some(config => config.rules?.['no-console'] === 'error'),
    'consumer rules should override shared rules',
  )
  assert.equal(
    strictRules.some(config => config.rules?.['pnpm/yaml-enforce-settings']),
    false,
    'consumer should be able to disable pnpm workspace rules',
  )
  assert.deepEqual(
    strictRules.find(config => config.name === 'antfu/ignores')?.ignores,
    ['generated/**'],
    'defaultIgnores=false should let consumers replace all default ignores',
  )
  const upstreamPnpmConfig = eslintFlatConfig.find(config => config.name === 'antfu/pnpm/pnpm-workspace-yaml')
  assert.deepEqual(
    upstreamPnpmConfig?.rules?.['pnpm/yaml-enforce-settings'],
    ['error', { settings: { shellEmulator: true, trustPolicy: 'no-downgrade' } }],
    'eslint config should keep antfu pnpm workspace policy unchanged',
  )
  assert.equal(eslintFlatConfig.some(config => config.name === 'antfu/unocss'), false)
  assert.equal(eslintFlatConfig.some(config => config.name?.startsWith('antfu/formatter/')), false)
  assert.ok(
    stylelintConfig.extends.some(path => path.endsWith('/stylelint-config-standard/index.js')),
    'stylelint config should include standard CSS rules',
  )
  const stylelintScssOverride = stylelintConfig.overrides.find(override => override.files.includes('*.scss'))
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
      const vueOverride = stylelintConfig.overrides?.find(override => override.files.includes('*.vue'))
      return Array.isArray(vueOverride?.extends)
        && vueOverride.extends.some(path => path.endsWith('/stylelint-config-recommended-vue/scss/index.js'))
    })(),
    'stylelint Vue override should include Vue SCSS container rules',
  )

  assert.equal(Object.hasOwn(stylelintRules, 'at-rule-no-unknown'), true)
  assert.equal(stylelintScssRules['scss/at-rule-no-unknown'][1], stylelintScssAtRuleOptions)
  assert.ok(stylelintScssAtRuleOptions.ignoreAtRules.includes('container-queries'))
  assert.equal(Object.hasOwn(stylelintRules, 'unit-no-unknown'), false)
  assert.equal(stylelintConfig.languageOptions, stylelintLanguageOptions)
  assert.equal(stylelintLanguageOptions.syntax.atRules.apply.comment, 'Utility-first framework directive')
  assert.equal(stylelintLanguageOptions.syntax.atRules['custom-variant'].comment, 'Utility-first framework directive')
  assert.deepEqual(stylelintLanguageOptions.syntax.units.length, ['rpx'])
  assert.equal(stylelintConfig.reportNeedlessDisables, stylelintReportOptions.reportNeedlessDisables)
  assert.deepEqual(stylelintReportOptions.reportNeedlessDisables, [true, { severity: 'warning' }])
  assert.deepEqual(stylelintReportOptions.reportUnscopedDisables, [true, { severity: 'warning' }])
  assert.equal(stylelintConfig.allowEmptyInput, stylelintExecutionOptions.allowEmptyInput)
  assert.equal(stylelintConfig.cache, stylelintExecutionOptions.cache)
  assert.equal(stylelintConfig.fix, stylelintExecutionOptions.fix)
  assert.deepEqual(stylelintExecutionOptions, {
    allowEmptyInput: true,
    cache: false,
    fix: false,
  })

  const cwd = process.cwd().replace(/\\/g, '/')
  assert.deepEqual(
    createStylelintIgnoreFiles({ cwd: '/workspace/project', globs: ['generated/**'] }),
    ['/workspace/project/generated/**'],
  )
  const stylelintIgnoreGlobs = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.nuxt/**',
    '**/.turbo/**',
    '**/.vercel/**',
    '**/.wrangler/**',
    '**/coverage/**',
  ]
  assert.deepEqual(stylelintIgnoreFiles, stylelintIgnoreGlobs.map(glob => `${cwd}/${glob}`))

  const mergedIgnoreFiles = [
    ...stylelintIgnoreFiles,
    'generated/**',
  ]
  assert.ok(mergedIgnoreFiles.includes('generated/**'), 'spread config should append local ignores')

  console.log('lint configs loaded')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
