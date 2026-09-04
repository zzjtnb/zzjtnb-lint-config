import assert from 'node:assert/strict'

import { describe, expect, it } from 'vitest'

import { viteCssLayerPlugin } from '../../src/plugins/css-layer'

interface FakeAsset {
  fileName: string
  source: string
  type: string
}

function createBundle(assets: FakeAsset[]) {
  return Object.fromEntries(assets.map(asset => [asset.fileName, asset]))
}

const LAYER_ORDER_STATEMENT
  = '@layer properties, theme, base, ant, antd, el, td, components, utilities;'

describe('viteCssLayerPlugin', () => {
  it('将匹配的 CSS 模块包入目标层', () => {
    const plugin = viteCssLayerPlugin({
      layerName: 'el',
      packageName: 'element-plus',
    })
    const transform = plugin.transform

    assert.ok(typeof transform === 'function', '必须提供 CSS 模块转换钩子')

    const result = transform.call(
      undefined as never,
      '.el-button { color: red; }',
      '/node_modules/element-plus/es/components/button/style/css/index.css?used',
    )

    expect(result).toEqual({
      code: '@layer el {\n.el-button { color: red; }\n}',
      map: null,
    })
  })

  it('不改写目标包以外的 CSS 模块', () => {
    const plugin = viteCssLayerPlugin({
      layerName: 'el',
      packageName: 'element-plus',
    })
    const transform = plugin.transform

    assert.ok(typeof transform === 'function', '必须提供 CSS 模块转换钩子')

    const result = transform.call(
      undefined as never,
      '.local { color: red; }',
      '/src/views/home/index.css',
    )

    expect(result).toBeUndefined()
  })

  it('不将包名后缀相同的其他包误判为目标包', () => {
    const plugin = viteCssLayerPlugin({ layerName: 'el', packageName: 'element-plus' })
    assert.ok(typeof plugin.transform === 'function')
    expect(plugin.transform.call(undefined as never, '.sample { color: red; }', '/node_modules/not-element-plus/style.css')).toBeUndefined()
  })

  it('支持 Windows 路径中的作用域包', () => {
    const plugin = viteCssLayerPlugin({ layerName: 'ui', packageName: '@example/ui' })
    assert.ok(typeof plugin.transform === 'function')
    expect(plugin.transform.call(undefined as never, '.sample { color: red; }', String.raw`C:\project\node_modules\@example\ui\style.css`)).toEqual({
      code: '@layer ui {\n.sample { color: red; }\n}',
      map: null,
    })
  })

  it('为匹配的 CSS 产物注入层顺序声明', () => {
    const plugin = viteCssLayerPlugin({
      layerName: 'el',
      packageName: 'element-plus',
    })
    const generateBundle = plugin.generateBundle

    assert.ok(typeof generateBundle === 'function', '必须提供产物层顺序注入钩子')

    const bundle = createBundle([
      {
        fileName: 'element-x.css',
        source: '@layer el{.el-button{color:red}}',
        type: 'asset',
      },
      {
        fileName: 'theme-x.css',
        source: '.local { color: blue; }',
        type: 'asset',
      },
    ])

    generateBundle.call(
      undefined as never,
      {} as never,
      bundle as never,
      false,
    )

    expect(bundle['element-x.css']!.source).toBe(
      `${LAYER_ORDER_STATEMENT}\n@layer el{.el-button{color:red}}`,
    )
    expect(bundle['theme-x.css']!.source).toBe('.local { color: blue; }')
  })

  it('已有层顺序声明时不重复注入', () => {
    const plugin = viteCssLayerPlugin({
      layerName: 'el',
      packageName: 'element-plus',
    })
    const generateBundle = plugin.generateBundle

    assert.ok(typeof generateBundle === 'function', '必须提供产物层顺序注入钩子')

    const bundle = createBundle([
      {
        fileName: 'element-x.css',
        source: `${LAYER_ORDER_STATEMENT}\n@layer el{.el-button{color:red}}`,
        type: 'asset',
      },
    ])

    generateBundle.call(
      undefined as never,
      {} as never,
      bundle as never,
      false,
    )

    expect(bundle['element-x.css']!.source).toBe(
      `${LAYER_ORDER_STATEMENT}\n@layer el{.el-button{color:red}}`,
    )
  })

  it('产物以 BOM 开头时仍注入层顺序声明', () => {
    const plugin = viteCssLayerPlugin({
      layerName: 'el',
      packageName: 'element-plus',
    })
    const generateBundle = plugin.generateBundle

    assert.ok(typeof generateBundle === 'function', '必须提供产物层顺序注入钩子')

    const bundle = createBundle([
      {
        fileName: 'element-x.css',
        source: `\uFEFF@layer el{.el-button{color:red}}`,
        type: 'asset',
      },
    ])

    generateBundle.call(
      undefined as never,
      {} as never,
      bundle as never,
      false,
    )

    expect(bundle['element-x.css']!.source).toBe(
      `${LAYER_ORDER_STATEMENT}\n\uFEFF@layer el{.el-button{color:red}}`,
    )
  })

  it('不改写非 CSS 产物', () => {
    const plugin = viteCssLayerPlugin({
      layerName: 'el',
      packageName: 'element-plus',
    })
    const generateBundle = plugin.generateBundle

    assert.ok(typeof generateBundle === 'function', '必须提供产物层顺序注入钩子')

    const bundle = createBundle([
      {
        fileName: 'element-x.js',
        source: '@layer el{.el-button{color:red}}',
        type: 'chunk',
      },
    ])

    generateBundle.call(
      undefined as never,
      {} as never,
      bundle as never,
      false,
    )

    expect(bundle['element-x.js']!.source).toBe(
      '@layer el{.el-button{color:red}}',
    )
  })
})
