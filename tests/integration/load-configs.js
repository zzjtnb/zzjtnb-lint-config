import assert from 'node:assert/strict'
import process from 'node:process'

import eslintConfig, {
  base,
  eslintDefaultFormatters,
  eslintDefaultIgnores,
  eslintDefaultMarkdown,
  eslintDefaultStylistic,
  eslintLinterOptions,
  eslintRuleOverrides,
  eslintRules,
  uno,
  vue,
} from 'eslint-config-zzjtnb'
import stylelintConfig, {
  stylelintExecutionOptions,
  stylelintIgnoreFiles,
  stylelintLanguageOptions,
  stylelintReportOptions,
  stylelintRules,
  stylelintScssAtRuleOptions,
} from 'stylelint-config-zzjtnb'

async function main() {
  const eslintResult = eslintConfig({
    unocss: false,
    vue: false,
  })
  const eslintFlatConfig = await eslintResult
  const eslintConfigNames = eslintFlatConfig.map(config => config.name).filter(Boolean)
  const eslintBaseResult = base()
  const eslintVueResult = vue()
  const eslintUnoResult = uno()

  assert.ok(eslintResult, 'eslint-config-zzjtnb should return an ESLint flat config composer')
  assert.ok(eslintBaseResult, 'base preset should return an ESLint flat config composer')
  assert.ok(eslintVueResult, 'vue preset should return an ESLint flat config composer')
  assert.ok(eslintUnoResult, 'uno preset should return an ESLint flat config composer')
  assert.ok(eslintConfigNames.includes('antfu/jsonc/setup'), 'eslint config should enable JSON / JSONC support')
  assert.ok(eslintConfigNames.includes('antfu/yaml/setup'), 'eslint config should enable YAML support')
  assert.ok(eslintConfigNames.includes('antfu/toml/setup'), 'eslint config should enable TOML support')
  assert.deepEqual(eslintDefaultFormatters, {
    html: true,
  })
  assert.equal(eslintDefaultMarkdown, false)
  assert.deepEqual(eslintDefaultStylistic, {
    indent: 2,
    quotes: 'single',
  })

  const sharedIgnoreGlobs = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.nuxt/**',
    '**/.turbo/**',
    '**/.vercel/**',
    '**/.wrangler/**',
    '**/coverage/**',
    '**/backup/**',
    '**/src-tauri/**',
    '**/src-tauri-harmony/**',
    '**/stats.html',
    '**/twa/project/**',
    '**/fonts/**',
    '**/shadcn-vue/**',
    '**/packages/*/README*.md',
  ]
  assert.deepEqual(eslintDefaultIgnores, sharedIgnoreGlobs)
  assert.deepEqual(eslintLinterOptions, {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  })
  assert.equal(eslintRules['no-console'], 'off')
  assert.equal(eslintRuleOverrides.rules, eslintRules)
  assert.ok(stylelintConfig.extends.includes('stylelint-config-recommended-scss'), 'stylelint config should include recommended SCSS rules')
  assert.ok(stylelintConfig.extends.includes('stylelint-config-recommended-vue/scss'), 'stylelint config should include Vue SCSS rules')

  assert.equal(Object.hasOwn(stylelintRules, 'at-rule-no-unknown'), false)
  assert.equal(stylelintRules['scss/at-rule-no-unknown'][1], stylelintScssAtRuleOptions)
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
  assert.deepEqual(stylelintIgnoreFiles, sharedIgnoreGlobs.map(glob => `${cwd}/${glob}`))

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
