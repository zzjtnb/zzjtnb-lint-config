import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { describe, it } from 'node:test'

import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

import manifest from '../../../package.json' with { type: 'json' }

const root = new URL('../../../', import.meta.url)

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
    fileURLToPath(new URL('scripts/preinstall/index.js', root)),
    ...args,
  ], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 10_000,
  })
}
describe('安装前检查', () => {
  it('安装守卫仅依赖 Node.js，pnpm 调用正常退出', () => {
    assert.strictEqual(manifest.scripts.preinstall, 'node ./scripts/preinstall/index.js')
    const result = runGuard('pnpm/12.14.0 node/v26.12.0 darwin arm64')
    assert.strictEqual(result.status, 0)
    assert.strictEqual(result.stderr, '')
    assert.strictEqual(result.stdout, '')
  })

  for (const agent of ['npm/11.0.0 node/v26.0.0', 'yarn/4.0.0 node/v26.0.0', undefined]) {
    it(`其他管理器或未知身份得到可恢复的失败：${agent}`, () => {
      const result = runGuard(agent)
      assert.strictEqual(result.status, 1)
      assert.ok((result.stderr).includes('pnpm install'))
    })
  }

  for (const agent of [
    '',
    'pnpm/',
    'pnpm/unknown',
    'pnpm/12.14.0/invalid',
    'pnpm-fake/12.14.0',
  ]) {
    it(`拒绝空身份、异常版本与相似管理器名：${agent}`, () => {
      const result = runGuard(agent)
      assert.strictEqual(result.status, 1)
      assert.ok((result.stderr).includes(manifest.packageManager))
      assert.ok((result.stderr).includes(manifest.engines.node))
      assert.ok((result.stderr).includes('pnpm install'))
    })
  }

  for (const agent of ['pnpm/11.0.0', 'pnpm/12.14.0-beta.1', 'pnpm/12.14.0+metadata']) {
    it(`只核对身份，不擅自把项目声明变成精确版本限制：${agent}`, () => {
      assert.strictEqual(runGuard(agent).status, 0)
    })
  }

  for (const flag of ['--help', '-h']) {
    it(`帮助无需管理器身份即可查看当前项目要求：${flag}`, () => {
      const result = runGuard(undefined, {
        args: [flag],
      })
      assert.strictEqual(result.status, 0)
      assert.ok((result.stdout).includes(manifest.packageManager))
      assert.ok((result.stdout).includes(manifest.engines.node))
      assert.ok((result.stdout).includes('不自动下载或升级'))
      assert.strictEqual(result.stderr, '')
    })
  }

  it('失败报告包含首次安装、指定版本更新与重新安装依赖的完整路径', () => {
    const result = runGuard('npm/11.0.0 extra-agent-details')
    assert.strictEqual(result.status, 1)
    assert.strictEqual(result.stdout, '')
    assert.ok((result.stderr).includes('当前使用 npm@11.0.0'))
    assert.ok((result.stderr).includes('项目环境'))
    assert.ok((result.stderr).includes('安装与恢复'))
    assert.ok((result.stderr).includes('curl -fsSL https://get.pnpm.io | sh -'))
    assert.ok((result.stderr).includes('wget -qO- https://get.pnpm.io | sh -'))
    assert.ok((result.stderr).includes('npx get-pnpm'))
    assert.ok((result.stderr).includes('irm https://get.pnpm.io/ps1 | iex'))
    assert.ok((result.stderr).includes(`pnpm self-update ${manifest.packageManager.slice('pnpm@'.length).split('+')[0]}`))
    assert.ok((result.stderr).includes('项目目录外执行'))
    assert.ok((result.stderr).includes('pnpm --version'))
    assert.ok((result.stderr).includes('pnpm install'))
    assert.ok((result.stderr).includes('https://pnpm.io/installation'))
    assert.ok(!(result.stderr).includes('extra-agent-details'))
  })

  it('完整列出官方平台选项，各平台推荐方式先于备选且不把备选称为不推荐', () => {
    const result = runGuard(undefined, {
      args: ['--help'],
    })
    assert.strictEqual(result.status, 0)
    const posix = result.stdout.split('macOS / Linux')[1].split('Windows')[0]
    assert.ok(posix.indexOf('官方推荐：独立安装脚本') < posix.indexOf('官方提供的备选：npm'))
    assert.ok((posix).includes('curl -fsSL https://get.pnpm.io | sh -'))
    assert.ok((posix).includes('wget -qO- https://get.pnpm.io | sh -'))
    assert.ok((posix).includes('npx get-pnpm'))
    const windows = result.stdout.split('\nWindows\n')[1].split('Docker 容器安装')[0]
    assert.ok(windows.indexOf('官方推荐：npm') < windows.indexOf('官方提供的备选：PowerShell'))
    assert.ok((windows).includes('Node.js 22.13+'))
    assert.ok((windows).includes('Windows Defender'))
    assert.ok((windows).includes('irm https://get.pnpm.io/ps1 | iex'))
    assert.ok((result.stdout).includes('已有 pnpm v11.10.0 或更新版本'))
    assert.ok((result.stdout).includes('预编译二进制'))
    assert.ok((result.stdout).includes('glibc 或 musl'))
    assert.ok((result.stdout).includes('运行本项目仍需满足前面的 Node.js 要求'))
  })

  for (const [shell, profile] of [
    ['bash', '.bashrc'],
    ['sh', '.shrc'],
    ['dash', '.dashrc'],
  ]) {
    it(`docker 的 ${shell} 安装指引保留对应配置文件和 shell 参数`, () => {
      const result = runGuard(undefined, {
        args: ['--help'],
      })
      assert.strictEqual(result.status, 0)
      assert.ok((result.stdout).includes(`wget -qO- https://get.pnpm.io | env ENV="$HOME/${profile}" SHELL="$(which ${shell})" ${shell} -`))
      assert.ok((result.stdout).includes('按镜像已有的 shell 选择一条命令，不要依次执行'))
    })
  }

  it('docker 指引说明跨层 PATH、镜像工具与权限前提，而不假定已有 bash', () => {
    const result = runGuard('npm/11.0.0')
    assert.strictEqual(result.status, 1)
    assert.ok((result.stderr).includes('Docker 容器安装（Linux 镜像'))
    assert.ok((result.stderr).includes('ENV PNPM_HOME="/pnpm"'))
    assert.ok((result.stderr).includes('ENV PATH="$PNPM_HOME/bin:$PATH"'))
    assert.ok((result.stderr).includes('安装用户需对 PNPM_HOME 可写'))
    assert.ok((result.stderr).includes('镜像需提供 wget、which、CA 证书和所选 shell'))
    assert.ok((result.stderr).includes('https://pnpm.io/docker'))
  })

  it('禁用颜色时输出纯文本，重定向日志不残留 ANSI 控制符', () => {
    const result = runGuard('npm/11.0.0', {
      envOverrides: { NO_COLOR: '1', FORCE_COLOR: undefined, NODE_DISABLE_COLORS: undefined },
    })
    assert.strictEqual(result.status, 1)
    assert.strictEqual(stripVTControlCharacters(result.stderr), result.stderr)
    assert.ok((result.stderr).includes('安装前检查未通过'))
  })

  it('显式开启颜色时仍向 stderr 输出原生着色的失败报告', () => {
    const result = runGuard('npm/11.0.0', {
      envOverrides: { FORCE_COLOR: '1', NO_COLOR: undefined, NODE_DISABLE_COLORS: undefined },
    })
    assert.strictEqual(result.status, 1)
    assert.strictEqual(result.stdout, '')
    assert.notStrictEqual(stripVTControlCharacters(result.stderr), result.stderr)
  })

  it('未知参数失败而不是静默忽略', () => {
    const result = runGuard('pnpm/12.14.0', {
      args: ['--unknown'],
    })
    assert.strictEqual(result.status, 1)
    assert.ok((result.stderr).includes('安装前检查失败'))
  })

  it('从其他目录调用仍能读取当前项目的要求', () => {
    const result = runGuard('npm/11.0.0', {
      cwd: fileURLToPath(new URL('playground/', root)),
    })
    assert.strictEqual(result.status, 1)
    assert.ok((result.stderr).includes(manifest.packageManager))
    assert.ok((result.stderr).includes(manifest.engines.pnpm))
  })
})
