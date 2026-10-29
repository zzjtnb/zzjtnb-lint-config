import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { findPackageJSON } from 'node:module'
import process from 'node:process'
import { describe, it } from 'node:test'

import { fileURLToPath } from 'node:url'
import semver from 'semver'

import ts from 'typescript'
import demo from '../../../apps/demo/package.json' with { type: 'json' }
import docs from '../../../docs/package.json' with { type: 'json' }
import manifest from '../../../package.json' with { type: 'json' }
import eslintPackage from '../../../packages/eslint/package.json' with { type: 'json' }
import markdownlintPackage from '../../../packages/markdownlint/package.json' with { type: 'json' }
import stylelintPackage from '../../../packages/stylelint/package.json' with { type: 'json' }
import playground from '../../../playground/package.json' with { type: 'json' }
import { cliPath } from '../helpers/cli.js'

const root = new URL('../../../', import.meta.url)
// 复用已声明的 TypeScript JSONC 解析器，不把带注释配置作为严格 JSON 导入。
const { config: turbo, error: turboError } = ts.readConfigFile(fileURLToPath(new URL('turbo.jsonc', root)), ts.sys.readFile)
assert.strictEqual(turboError, undefined)
describe('仓库工作区契约', () => {
  for (const name of ['eslint', 'vitest', 'markdownlint-cli2']) {
    it(`仓库声明的 Node.js 范围不能包含 ${name} 不支持的版本`, () => {
      const tool = JSON.parse(readFileSync(findPackageJSON(name, new URL('../../../playground/package.json', import.meta.url)), 'utf8'))
      assert.strictEqual(semver.subset(manifest.engines.node, tool.engines.node), true)
    })
  }

  it('工作区使用 Node.js 26，公开包保留各自的消费方环境契约', () => {
    assert.strictEqual(semver.minVersion(manifest.engines.node).major, 26)
    assert.strictEqual(semver.satisfies('20.19.0', eslintPackage.engines.node), true)
    assert.strictEqual(semver.satisfies('20.19.0', stylelintPackage.engines.node), false)
  })

  for (const [directory, pkg] of [
    ['packages/eslint', eslintPackage],
    ['packages/stylelint', stylelintPackage],
  ]) {
    it(`${directory} 的 Node.js 范围不超出直接运行依赖的支持范围`, () => {
      const base = new URL(`../../../${directory}/package.json`, import.meta.url)
      for (const name of Object.keys(pkg.dependencies)) {
        const upstream = JSON.parse(readFileSync(findPackageJSON(name, base), 'utf8'))
        if (upstream.engines?.node) {
          assert.strictEqual(semver.subset(pkg.engines.node, upstream.engines.node), true, `${name} 要求 Node.js ${upstream.engines.node}`)
        }
      }
    })
  }

  it('Vue 样式上游声明的必需 peer 由共享包提供，检查引擎由消费项目提供', () => {
    const upstream = JSON.parse(readFileSync(findPackageJSON('stylelint-config-recommended-vue', new URL('../../../packages/stylelint/package.json', import.meta.url)), 'utf8'))
    for (const name of Object.keys(upstream.peerDependencies)) {
      const required = !upstream.peerDependenciesMeta?.[name]?.optional
      if (required) {
        assert.ok(Object.hasOwn(stylelintPackage.dependencies, name) || Object.hasOwn(stylelintPackage.peerDependencies, name), `缺少上游 peer：${name}`)
      }
    }
  })

  for (const [_name, format, lint, pkg] of [
    [
      '仓库',
      'format:eslint',
      'lint:eslint',
      manifest,
    ],
    [
      '仓库',
      'format:stylelint',
      'lint:stylelint',
      manifest,
    ],
    [
      '仓库',
      'format:markdownlint',
      'lint:markdownlint',
      manifest,
    ],
    [
      '消费示例',
      'format:eslint',
      'lint:eslint',
      demo,
    ],
    [
      '消费示例',
      'format:stylelint',
      'lint:stylelint',
      demo,
    ],
    [
      '消费示例',
      'format:markdownlint',
      'lint:markdownlint',
      demo,
    ],
  ]) {
    it(`${_name} 的 ${format} 复用检查入口并只追加修复参数`, () => {
      assert.strictEqual(pkg.scripts[format], `pnpm run ${lint} --fix`)
      assert.ok(!(pkg.scripts[lint]).includes('--fix'))
      assert.strictEqual(pkg.scripts[`pre${format}`], undefined)
    })
  }

  for (const [_name, pkg, tools] of [
    [
      '仓库',
      manifest,
      ['eslint', 'stylelint', 'markdownlint'],
    ],
    [
      '消费示例',
      demo,
      ['eslint', 'stylelint', 'markdownlint'],
    ],
  ]) {
    it(`${_name} 的检查与格式化分别按单项、汇总顺序连续排列`, () => {
      const expected = [
        ...tools.map(tool => `lint:${tool}`),
        'lint',
        ...(pkg.scripts['lint:tui']
          ? ['lint:tui']
          : []),
        ...tools.map(tool => `format:${tool}`),
        'format',
      ]
      const keys = Object.keys(pkg.scripts)
      const start = keys.indexOf(expected[0])
      assert.deepStrictEqual(keys.slice(start, start + expected.length), expected)
    })
  }

  for (const [_name, pkg, directory] of [
    ['消费示例', demo, 'apps/demo'],
  ]) {
    it(`${_name} 的 Markdown 检查使用自带配置并继承共享包，不引用上级目录`, () => {
      assert.strictEqual(pkg.devDependencies['@zzjtnb/markdownlint-config'], 'workspace:*')
      assert.strictEqual(pkg.devDependencies['markdownlint-cli2'], 'catalog:')
      assert.doesNotMatch(pkg.scripts['lint:markdownlint'], /\.\.\/|--config/)
      const config = readFileSync(new URL(`${directory}/.markdownlint-cli2.mjs`, root), 'utf8')
      assert.ok(config.includes('from \'@zzjtnb/markdownlint-config/config\''))
    })
  }

  it('根脚本按开发、构建、预览、类型检查、测试和维护流程排列', () => {
    const keys = Object.keys(manifest.scripts)
    assert.deepStrictEqual(keys.slice(0, 6), [
      'dev',
      'predev',
      'build',
      'preview',
      'typecheck',
      'test',
    ])
    assert.ok(keys.indexOf('preinstall') > keys.indexOf('typecheck'))
    assert.ok(keys.indexOf('release') > keys.indexOf('postinstall'))
    assert.deepStrictEqual(keys.filter(key => key.startsWith('lint:workspaces')), [])
    const quality = [
      'lint:eslint',
      'lint:stylelint',
      'lint:markdownlint',
      'lint',
      'lint:tui',
      'format:eslint',
      'format:stylelint',
      'format:markdownlint',
      'format',
    ]
    assert.deepStrictEqual(keys.slice(keys.indexOf('lint:eslint'), keys.indexOf('lint:eslint') + quality.length), quality)
    for (const pkg of [eslintPackage, stylelintPackage, markdownlintPackage]) {
      assert.deepStrictEqual(Object.keys(pkg.scripts), [
        'dev',
        'build',
        'typecheck',
        'test',
        'release',
        'prepublishOnly',
      ])
    }
    assert.deepStrictEqual(Object.keys(playground.scripts).slice(0, 7), [
      'dev',
      'build',
      'build-only',
      'preview',
      'typecheck',
      'test:e2e',
      'test:unit',
    ])
    assert.deepStrictEqual(Object.keys(docs.scripts), [
      'dev',
      'build',
      'preview',
      'typecheck',
      'test',
    ])
  })

  for (const path of [
    'packages/eslint/README.md',
    'packages/eslint/README.zh-CN.md',
    'packages/stylelint/README.md',
    'packages/stylelint/README.zh-CN.md',
  ]) {
    it(`公开脚本示例不把额外的参数终止符传给 linter：${path}`, () => {
      const source = readFileSync(new URL(path, root), 'utf8')
      const examples = [
        ...source.matchAll(/```json\n([\s\S]*?)\n```/g),
      ]
        .filter(match => match[1].includes('"scripts"'))
      assert.ok(examples.length > 0)
      for (const example of examples) {
        const { scripts } = JSON.parse(example[1])
        for (const command of Object.values(scripts)) {
          if (command.startsWith('pnpm run '))
            assert.ok(!(command).includes(' -- --fix'))
        }
      }
    })
  }

  it('文档、工作台和手册只使用根检查，不保留子级配置或转发脚本', () => {
    for (const [pkg, directory] of [
      [docs, 'docs'],
      [playground, 'playground'],
    ]) {
      assert.deepStrictEqual(Object.keys(pkg.scripts ?? {}).filter(key => /^(?:prelint|lint|format)(?::|$)/.test(key)), [])
      for (const file of ['eslint.config.js', 'stylelint.config.js', '.markdownlint-cli2.jsonc']) assert.strictEqual(existsSync(new URL(`${directory}/${file}`, root)), false)
    }
    assert.strictEqual(Object.keys(eslintPackage.scripts)[0], 'dev')
    assert.strictEqual(Object.keys(stylelintPackage.scripts)[0], 'dev')
    assert.strictEqual(eslintPackage.scripts.build, 'tsdown')
    assert.strictEqual(stylelintPackage.scripts.build, 'tsdown')
    assert.strictEqual(markdownlintPackage.scripts.build, 'tsdown')
  })

  it('根检查依赖公开包 build，不为 Docs 或 Playground 创建检查任务', () => {
    const result = spawnSync(process.execPath, [
      cliPath('turbo', 'turbo', new URL('../../../package.json', import.meta.url)),
      'run',
      '//#lint:eslint',
      '//#lint:stylelint',
      '//#lint:markdownlint',
      '--dry=json',
    ], {
      cwd: fileURLToPath(root),
      encoding: 'utf8',
      timeout: 10_000,
    })
    assert.strictEqual(result.status, 0, result.stderr)
    const { tasks } = JSON.parse(result.stdout)
    for (const tool of ['eslint', 'stylelint']) {
      const task = tasks.find(task => task.taskId === `//#lint:${tool}`)
      assert.partialDeepStrictEqual(task.dependencies, ['@zzjtnb/eslint-config#build', '@zzjtnb/markdownlint-config#build', '@zzjtnb/stylelint-config#build'])
      assert.strictEqual(task.resolvedTaskDefinition.cache, false)
    }
    assert.strictEqual(tasks.some(task => /@zzjtnb\/(?:docs|playground|handbook)#lint/.test(task.taskId)), false)
  })

  it('预览是禁用缓存的长驻任务，不把服务启动当成文件产物', () => {
    assert.strictEqual(turbo.tasks.preview.cache, false)
    assert.strictEqual(turbo.tasks.preview.persistent, true)
    assert.strictEqual(turbo.tasks.preview.outputs, undefined)
    const result = spawnSync(process.execPath, [
      cliPath('turbo', 'turbo', new URL('../../../package.json', import.meta.url)),
      'run',
      'preview',
      '--dry=json',
    ], {
      cwd: fileURLToPath(root),
      encoding: 'utf8',
      timeout: 10_000,
    })
    assert.strictEqual(result.status, 0, result.stderr)
    const { tasks } = JSON.parse(result.stdout)
    for (const name of ['docs', 'playground']) {
      const task = tasks.find(task => task.taskId === `@zzjtnb/${name}#preview`)
      assert.deepStrictEqual(task.dependencies, [`@zzjtnb/${name}#build`])
    }
    const build = tasks.find(task => task.taskId === '@zzjtnb/playground#build')
    assert.deepStrictEqual(build.outputs, ['dist/**'])
    assert.ok(Object.keys(build.inputs).some(path => path.endsWith('docs/.vitepress/theme/styles/variables.scss')))
  })
})

for (const name of ['eslint', 'stylelint', 'markdownlint']) {
  for (const file of ['README.md', 'README.zh-CN.md']) {
    it(`${name}/${file} 的跨文档链接不依赖 npm 页面中的相对路径`, () => {
      const source = readFileSync(new URL(`../../../packages/${name}/${file}`, import.meta.url), 'utf8')
      // npm 页面和仓库目录的 URL 基准不同，语言切换与源码链接均使用完整地址。
      assert.doesNotMatch(source, /(?:\]\(|href=["'])\.\.?\//)
      const other = file === 'README.md'
        ? 'README.zh-CN.md'
        : 'README.md'
      assert.ok(source.includes(`https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/${name}/${other}`))
    })
  }
}

for (const [directory, pkg] of [
  ['eslint', eslintPackage],
  ['stylelint', stylelintPackage],
  ['markdownlint', markdownlintPackage],
]) {
  it(`${directory} 的 npm 身份、使用文档主页与仓库目录一致`, () => {
    assert.strictEqual(pkg.name, `@zzjtnb/${directory}-config`)
    assert.strictEqual(pkg.repository.directory, `packages/${directory}`)
    assert.strictEqual(pkg.homepage, `https://lint.docs.zzjtnb.com/${directory}`)
    assert.ok(existsSync(new URL(`../../../${pkg.repository.directory}/package.json`, import.meta.url)))
  })
}
