/** 按真实文件语法比较上游与本包规则，只有实际差异才由本包维护。 */
import stylelint from 'stylelint'
import { expect, it } from 'vitest'

import { fileOverrides } from '../src/configs/files'
import { basePresets } from '../src/configs/presets'
import { orderRules } from '../src/rules/order'
import { sharedRules } from '../src/rules/shared'

/** 未配置、null 和 false 均视为不启用规则，比较有效行为而非无效参数。 */
function effectiveRule(value: unknown) {
  const primary = Array.isArray(value)
    ? value[0]
    : value
  return primary == null || primary === false
    ? undefined
    : value
}

it('全局规则至少在一个适用语法中不同，文件规则在自身作用域中不同', async () => {
  const globalRules = {
    ...sharedRules,
    ...orderRules,
  }
  const differences = new Set<string>()
  for (const override of fileOverrides()) {
    const extension = override.files[0]!.split('.').at(-1)!
    const filename = `sample.${extension}`
    const config = {
      extends: [
        ...basePresets,
        ...(Array.isArray(override.extends)
          ? override.extends
          : []),
      ],
      ...(override.customSyntax
        ? { customSyntax: override.customSyntax }
        : {}),
    }
    const upstream = await stylelint.resolveConfig(filename, { config })
    const configured = await stylelint.resolveConfig(filename, {
      config: {
        ...config,
        rules: {
          ...globalRules,
          ...override.rules,
        },
      },
    })
    if (['scss', 'vue'].includes(extension)) {
      // 解析器由本包提供实例，规则与语法行为仍继承上游。
      expect(override.customSyntax).toBeDefined()
      expect(upstream?.customSyntax).toBeDefined()
      expect(configured?.customSyntax).toEqual(upstream?.customSyntax)
    }
    for (const rule of Object.keys(globalRules)) {
      if (JSON.stringify(effectiveRule(configured?.rules?.[rule])) !== JSON.stringify(effectiveRule(upstream?.rules?.[rule])))
        differences.add(rule)
    }
    for (const rule of Object.keys(override.rules ?? {})) {
      expect(effectiveRule(configured?.rules?.[rule]), `${extension}: ${rule} 与上游重复`)
        .not
        .toEqual(effectiveRule(upstream?.rules?.[rule]))
    }
  }
  expect(Object.keys(globalRules).filter(rule => !differences.has(rule))).toEqual([])
})

it('移除的规则在各语法中沿用上游最终值，消费方仍可覆盖', async () => {
  const { zzjtnb } = await import('../src/index')
  const rules = [
    'at-rule-no-unknown',
    'at-rule-no-deprecated',
    'font-family-no-missing-generic-family-keyword',
    'import-notation',
    'media-feature-range-notation',
    'named-grid-areas-no-invalid',
    'nesting-selector-no-missing-scoping-root',
    'no-descending-specificity',
    'selector-class-pattern',
    'selector-not-notation',
    'no-invalid-position-declaration',
    'rule-empty-line-before',
    'scss/operator-no-newline-after',
  ]
  for (const override of fileOverrides()) {
    const filename = `sample.${override.files[0]!.split('.').at(-1)}`
    const upstream = await stylelint.resolveConfig(filename, {
      config: {
        extends: [
          ...basePresets,
          ...(Array.isArray(override.extends)
            ? override.extends
            : []),
        ],
        ...(override.customSyntax
          ? { customSyntax: override.customSyntax }
          : {}),
      },
    })
    const actual = await stylelint.resolveConfig(filename, {
      config: zzjtnb(),
    })
    for (const rule of rules)
      expect(actual?.rules?.[rule], `${filename}: ${rule}`).toEqual(upstream?.rules?.[rule])
  }
  const custom = await stylelint.resolveConfig('consumer.css', {
    config: zzjtnb({
      rules: { 'selector-class-pattern': null },
    }),
  })
  expect(custom?.rules?.['selector-class-pattern']).toBeNull()
})
