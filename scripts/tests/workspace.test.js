import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire, findPackageJSON } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

import { describe, expect, it } from 'vitest'

import demo from '../../apps/demo/package.json' with { type: 'json' }
import handbook from '../../apps/handbook/package.json' with { type: 'json' }
import docs from '../../docs/package.json' with { type: 'json' }
import nodeUtils from '../../internal/node-utils/package.json' with { type: 'json' }
import manifest from '../../package.json' with { type: 'json' }
import eslintPackage from '../../packages/eslint-config/package.json' with { type: 'json' }
import markdownlintPackage from '../../packages/markdownlint-config/package.json' with { type: 'json' }
import stylelintPackage from '../../packages/stylelint-config/package.json' with { type: 'json' }
import playground from '../../playground/package.json' with { type: 'json' }
import { cliPath } from '../../tests/helpers/cli.js'
import turbo from '../../turbo.json' with { type: 'json' }

const root = new URL('../../', import.meta.url)
// semver 归 ESLint 的正式依赖，使用其解析上下文，不引入根级幽灵依赖。
const require = createRequire(import.meta.resolve('eslint'))
const semver = require('semver')

function runGuard(agent, { args = [], cwd = fileURLToPath(root), envOverrides = {} } = {}) {
  const env = {
    ...process.env,
    ...envOverrides,
  }
  if (agent === undefined)
    delete env.npm_config_user_agent
  else
    env.npm_config_user_agent = agent
  return spawnSync(process.execPath, [
    fileURLToPath(new URL('scripts/preinstall.js', root)),
    ...args,
  ], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 10_000,
  })
}

describe('工作区安装与任务契约', () => {
  it('安装守卫仅依赖 Node.js，pnpm 调用正常退出', () => {
    expect(manifest.scripts.preinstall).toBe('node ./scripts/preinstall.js')
    const result = runGuard('pnpm/12.14.0 node/v26.12.0 darwin arm64')
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toBe('')
  })

  it.each(['npm/11.0.0 node/v26.0.0', 'yarn/4.0.0 node/v26.0.0', undefined])('其他管理器或未知身份得到可恢复的失败：%s', (agent) => {
    const result = runGuard(agent)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('pnpm install')
  })

  it.each([
    '',
    'pnpm/',
    'pnpm/unknown',
    'pnpm/12.14.0/invalid',
    'pnpm-fake/12.14.0',
  ])('拒绝空身份、异常版本与相似管理器名：%s', (agent) => {
    const result = runGuard(agent)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(manifest.packageManager)
    expect(result.stderr).toContain(manifest.engines.node)
    expect(result.stderr).toContain('pnpm install')
  })

  it.each(['pnpm/11.0.0', 'pnpm/12.14.0-beta.1', 'pnpm/12.14.0+metadata'])('只核对身份，不擅自把项目声明变成精确版本限制：%s', (agent) => {
    expect(runGuard(agent).status).toBe(0)
  })

  it.each(['--help', '-h'])('帮助无需管理器身份即可查看当前项目要求：%s', (flag) => {
    const result = runGuard(undefined, {
      args: [flag],
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(manifest.packageManager)
    expect(result.stdout).toContain(manifest.engines.node)
    expect(result.stdout).toContain('不自动下载或升级')
    expect(result.stderr).toBe('')
  })

  it('失败报告包含首次安装、指定版本更新与重新安装依赖的完整路径', () => {
    const result = runGuard('npm/11.0.0 extra-agent-details')
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('当前使用 npm@11.0.0')
    expect(result.stderr).toContain('项目环境')
    expect(result.stderr).toContain('安装与恢复')
    expect(result.stderr).toContain('curl -fsSL https://get.pnpm.io | sh -')
    expect(result.stderr).toContain('wget -qO- https://get.pnpm.io | sh -')
    expect(result.stderr).toContain('npx get-pnpm')
    expect(result.stderr).toContain('irm https://get.pnpm.io/ps1 | iex')
    expect(result.stderr).toContain(`pnpm self-update ${manifest.packageManager.slice('pnpm@'.length).split('+')[0]}`)
    expect(result.stderr).toContain('项目目录外执行')
    expect(result.stderr).toContain('pnpm --version')
    expect(result.stderr).toContain('pnpm install')
    expect(result.stderr).toContain('https://pnpm.io/installation')
    expect(result.stderr).not.toContain('extra-agent-details')
  })

  it('完整列出官方平台选项，各平台推荐方式先于备选且不把备选称为不推荐', () => {
    const result = runGuard(undefined, {
      args: ['--help'],
    })
    expect(result.status).toBe(0)
    const posix = result.stdout.split('macOS / Linux')[1].split('Windows')[0]
    expect(posix.indexOf('官方推荐：独立安装脚本')).toBeLessThan(posix.indexOf('官方提供的备选：npm'))
    expect(posix).toContain('curl -fsSL https://get.pnpm.io | sh -')
    expect(posix).toContain('wget -qO- https://get.pnpm.io | sh -')
    expect(posix).toContain('npx get-pnpm')
    const windows = result.stdout.split('\nWindows\n')[1].split('Docker 容器安装')[0]
    expect(windows.indexOf('官方推荐：npm')).toBeLessThan(windows.indexOf('官方提供的备选：PowerShell'))
    expect(windows).toContain('Node.js 22.13+')
    expect(windows).toContain('Windows Defender')
    expect(windows).toContain('irm https://get.pnpm.io/ps1 | iex')
    expect(result.stdout).toContain('已有 pnpm v11.10.0 或更新版本')
    expect(result.stdout).toContain('预编译二进制')
    expect(result.stdout).toContain('glibc 或 musl')
    expect(result.stdout).toContain('运行本项目仍需满足前面的 Node.js 要求')
  })

  it.each([
    ['bash', '.bashrc'],
    ['sh', '.shrc'],
    ['dash', '.dashrc'],
  ])('docker 的 %s 安装指引保留对应配置文件和 shell 参数', (shell, profile) => {
    const result = runGuard(undefined, {
      args: ['--help'],
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`wget -qO- https://get.pnpm.io | env ENV="$HOME/${profile}" SHELL="$(which ${shell})" ${shell} -`)
    expect(result.stdout).toContain('按镜像已有的 shell 选择一条命令，不要依次执行')
  })

  it('docker 指引说明跨层 PATH、镜像工具与权限前提，而不假定已有 bash', () => {
    const result = runGuard('npm/11.0.0')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Docker 容器安装（Linux 镜像')
    expect(result.stderr).toContain('ENV PNPM_HOME="/pnpm"')
    expect(result.stderr).toContain('ENV PATH="$PNPM_HOME/bin:$PATH"')
    expect(result.stderr).toContain('安装用户需对 PNPM_HOME 可写')
    expect(result.stderr).toContain('镜像需提供 wget、which、CA 证书和所选 shell')
    expect(result.stderr).toContain('https://pnpm.io/docker')
  })

  it('禁用颜色时输出纯文本，重定向日志不残留 ANSI 控制符', () => {
    const result = runGuard('npm/11.0.0', {
      envOverrides: { NO_COLOR: '1', FORCE_COLOR: undefined, NODE_DISABLE_COLORS: undefined },
    })
    expect(result.status).toBe(1)
    expect(stripVTControlCharacters(result.stderr)).toBe(result.stderr)
    expect(result.stderr).toContain('安装前检查未通过')
  })

  it('显式开启颜色时仍向 stderr 输出原生着色的失败报告', () => {
    const result = runGuard('npm/11.0.0', {
      envOverrides: { FORCE_COLOR: '1', NO_COLOR: undefined, NODE_DISABLE_COLORS: undefined },
    })
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(stripVTControlCharacters(result.stderr)).not.toBe(result.stderr)
  })

  it('未知参数失败而不是静默忽略', () => {
    const result = runGuard('pnpm/12.14.0', {
      args: ['--unknown'],
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('安装前检查失败')
  })

  it('从其他目录调用仍能读取当前项目的要求', () => {
    const result = runGuard('npm/11.0.0', {
      cwd: fileURLToPath(new URL('playground/', root)),
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(manifest.packageManager)
    expect(result.stderr).toContain(manifest.engines.pnpm)
  })

  it.each(['eslint', 'vitest', 'markdownlint-cli2'])('仓库声明的 Node.js 范围不能包含 %s 不支持的版本', (name) => {
    const tool = JSON.parse(readFileSync(findPackageJSON(name, import.meta.url), 'utf8'))
    expect(semver.subset(manifest.engines.node, tool.engines.node)).toBe(true)
  })

  it('工作区使用 Node.js 26，公开包保留各自的消费方环境契约', () => {
    expect(semver.minVersion(manifest.engines.node).major).toBe(26)
    expect(semver.satisfies('20.19.0', eslintPackage.engines.node)).toBe(true)
    expect(semver.satisfies('20.19.0', stylelintPackage.engines.node)).toBe(true)
  })

  it.each([
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
      '工作台',
      'format:eslint',
      'lint:eslint',
      playground,
    ],
    [
      '工作台',
      'format:stylelint',
      'lint:stylelint',
      playground,
    ],
    [
      '文档站',
      'format:eslint',
      'lint:eslint',
      docs,
    ],
    [
      '文档站',
      'format:stylelint',
      'lint:stylelint',
      docs,
    ],
    [
      '文档站',
      'format:markdownlint',
      'lint:markdownlint',
      docs,
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
    [
      '维护手册',
      'format:markdownlint',
      'lint:markdownlint',
      handbook,
    ],
    [
      '公开代码配置',
      'format',
      'lint:eslint',
      eslintPackage,
    ],
    [
      '公开样式配置',
      'format',
      'lint:eslint',
      stylelintPackage,
    ],
    [
      '公开文档配置',
      'format',
      'lint:eslint',
      markdownlintPackage,
    ],
  ])('%s 的 %s 复用检查入口并只追加修复参数', (_name, format, lint, pkg) => {
    expect(pkg.scripts[format]).toBe(`pnpm run ${lint} --fix`)
    expect(pkg.scripts[lint]).not.toContain('--fix')
    expect(pkg.scripts[`pre${format}`]).toBeUndefined()
  })

  it.each([
    [
      '仓库',
      manifest,
      ['eslint', 'stylelint', 'markdownlint'],
    ],
    [
      '工作台',
      playground,
      ['eslint', 'stylelint'],
    ],
    [
      '文档站',
      docs,
      ['eslint', 'stylelint', 'markdownlint'],
    ],
    [
      '消费示例',
      demo,
      ['eslint', 'stylelint', 'markdownlint'],
    ],
    [
      '维护手册',
      handbook,
      ['markdownlint'],
    ],
  ])('%s 的检查与格式化按单项、汇总顺序连续排列', (_name, pkg, tools) => {
    const expected = [
      ...tools.map(tool => `lint:${tool}`),
      'lint',
      ...tools.map(tool => `format:${tool}`),
      'format',
    ]
    const keys = Object.keys(pkg.scripts)
    const start = keys.indexOf(expected[0])
    expect(keys.slice(start, start + expected.length)).toEqual(expected)
  })

  it.each([
    ['文档站', docs, 'docs'],
    ['消费示例', demo, 'apps/demo'],
    ['维护手册', handbook, 'apps/handbook'],
  ])('%s 的 Markdown 检查使用自带配置并继承共享包，不引用上级目录', (_name, pkg, directory) => {
    expect(pkg.devDependencies['@zzjtnb/markdownlint-config']).toBe('workspace:*')
    expect(pkg.devDependencies['markdownlint-cli2']).toBe('catalog:')
    expect(pkg.scripts['lint:markdownlint']).not.toMatch(/\.\.\/|--config/)
    const config = readFileSync(new URL(`${directory}/.markdownlint-cli2.jsonc`, root), 'utf8')
    expect(config).toContain('"extends": "@zzjtnb/markdownlint-config"')
  })

  it('根脚本以安装入口开头，再按开发、构建、类型检查等工作流排列，测试收尾', () => {
    const keys = Object.keys(manifest.scripts)
    expect(keys.slice(0, 10)).toEqual([
      'bootstrap',
      'preinstall',
      'postinstall',
      'dev',
      'build',
      'preview',
      'typecheck:root',
      'typecheck',
      'clean',
      'release',
    ])
    expect(keys.slice(-4)).toEqual([
      'test',
      'test:unit',
      'test:integration',
      'test:packages',
    ])
    expect(keys.indexOf('lint:workspaces:eslint')).toBeGreaterThan(keys.indexOf('format'))
    expect(keys.indexOf('lint:tui')).toBeLessThan(keys.indexOf('test'))
  })

  it('内部工具构建保留原两阶段参数，直接使用 package scripts 的工具入口', () => {
    expect(nodeUtils.scripts.stub.split(' && ')).toEqual([
      'tsdown --no-dts',
      'tsc -p tsconfig.build.json --emitDeclarationOnly --declaration --outDir dist',
    ])
  })

  it.each([
    'packages/eslint-config/README.md',
    'packages/eslint-config/README.zh-CN.md',
    'packages/stylelint-config/README.md',
    'packages/stylelint-config/README.zh-CN.md',
  ])('公开脚本示例不把额外的参数终止符传给 linter：%s', (path) => {
    const source = readFileSync(new URL(path, root), 'utf8')
    const examples = [
      ...source.matchAll(/```json\n([\s\S]*?)\n```/g),
    ]
      .filter(match => match[1].includes('"scripts"'))
    expect(examples.length).toBeGreaterThan(0)
    for (const example of examples) {
      const { scripts } = JSON.parse(example[1])
      for (const command of Object.values(scripts)) {
        if (command.startsWith('pnpm run '))
          expect(command).not.toContain(' -- --fix')
      }
    }
  })

  it('站点检查任务不打包页面，工作台仅构建实际消费的依赖包', () => {
    const result = spawnSync(process.execPath, [
      cliPath('turbo'),
      'run',
      'lint:eslint',
      'lint:stylelint',
      '--filter=@zzjtnb/docs',
      '--filter=@zzjtnb/playground',
      '--dry=json',
    ], {
      cwd: fileURLToPath(root),
      encoding: 'utf8',
      timeout: 10_000,
    })
    expect(result.status, result.stderr).toBe(0)
    const { tasks } = JSON.parse(result.stdout)
    for (const tool of ['eslint', 'stylelint']) {
      const docsTask = tasks.find(task => task.taskId === `@zzjtnb/docs#lint:${tool}`)
      expect(docsTask.dependencies).toEqual(expect.arrayContaining(['@zzjtnb/eslint-config#build', '@zzjtnb/stylelint-config#build']))
      expect(docsTask.resolvedTaskDefinition.cache).toBe(false)
      const playgroundTask = tasks.find(task => task.taskId === `@zzjtnb/playground#lint:${tool}`)
      expect(playgroundTask.dependencies).toEqual(expect.arrayContaining([
        '@zzjtnb/eslint-config#build', '@zzjtnb/stylelint-config#build',
      ]))
      expect(playgroundTask.dependencies).not.toContain('@zzjtnb/playground#build')
      expect(playgroundTask.resolvedTaskDefinition.cache).toBe(false)
    }
  })

  it('预览是禁用缓存的长驻任务，不把服务启动当成文件产物', () => {
    expect(turbo.tasks.preview.cache).toBe(false)
    expect(turbo.tasks.preview.persistent).toBe(true)
    expect(turbo.tasks.preview.outputs).toBeUndefined()
  })
})
