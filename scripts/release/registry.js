import { capture, run } from './command.js'
import { packageVersion } from './packages.js'
import { chooseMenu, chooseRetryOrAbort, handOverTerminal } from './prompt.js'

// 查询、登录和发布统一使用 npm 官方源，不受本机默认镜像影响。
const REGISTRY = 'https://registry.npmjs.org/'

/**
 * 查询公开包在 npm 官方源上的 latest、全部已发布版本和曾取消发布的版本。
 * @param {string} packageName 公开包名。
 * @returns {Promise<{notFound: boolean, remote?: string, publishedVersions: string[], unpublishedVersions: string[]}>} registry 状态；404 时 notFound 为 true。
 * @throws {Error} 除 404 外的非成功响应或网络失败时抛出，调用方不得把它当作“未发布”。
 */
async function npmPackageState(packageName) {
  const response = await fetch(`${REGISTRY}${encodeURIComponent(packageName)}`)
  if (response.status === 404) {
    return {
      notFound: true,
      remote: undefined,
      publishedVersions: [],
      unpublishedVersions: [],
    }
  }
  if (!response.ok)
    throw new Error(`查询 ${packageName} 失败：HTTP ${response.status}`)

  const metadata = await response.json()
  return {
    notFound: false,
    remote: metadata['dist-tags']?.latest,
    // latest 只是分发标签；其他标签下已经发布的版本同样不可覆盖。
    publishedVersions: Object.keys(metadata.versions ?? {}),
    unpublishedVersions: metadata.time?.unpublished?.versions ?? [],
  }
}

async function npmUser() {
  const result = await capture('pnpm', ['whoami', '--registry', REGISTRY])
  return result.code === 0
    ? result.stdout.trim()
    : undefined
}

/**
 * 确认已登录 npm 官方源；未登录时提供登录、重试或中止。
 * @returns {Promise<boolean>} 已登录返回 true，用户中止返回 false。
 */
async function ensureLogin() {
  while (true) {
    const user = await npmUser()
    if (user) {
      console.log(`已登录 npm：${user}`)
      return true
    }

    console.log('当前未登录 npm，发布前必须先登录。')
    const action = await chooseMenu('npm 登录状态异常，请选择操作', [
      { description: '打开 npm 官方登录流程', key: 'l', label: '登录' },
      { description: '不改变当前状态，重新检查登录', key: 'r', label: '重试' },
      { description: '退出发布流程', key: 'a', label: '中止' },
    ])
    if (action === 'a')
      return false
    if (action === 'r')
      continue

    const code = await handOverTerminal(() => run('pnpm', ['login', '--registry', REGISTRY]))
    if (code !== 0)
      console.log('npm 登录失败。')
  }
}

function printReleaseState(state) {
  console.log('\n版本状态：')
  for (const item of state) {
    const status = item.unpublishedVersions.includes(item.local)
      ? `npm ${item.local} 曾发布后删除，版本不可复用`
      : item.notFound
        ? 'npm 未找到（可能是新包，或整包取消发布后的 24 小时保护期）'
        : `npm ${item.remote ?? '未发布'}`
    console.log(`- ${item.name}: 本地 ${item.local} / ${status}`)
  }
}

/**
 * 读取所选包的本地版本与 registry 状态并打印；查询失败时提供重试或中止。
 * @param {string[]} packageNames 本次选择的公开包名。
 * @returns {Promise<Array<{name: string, local: string, notFound: boolean, remote?: string, publishedVersions: string[], unpublishedVersions: string[]}> | undefined>} 按所选顺序的状态；中止时返回 undefined。
 */
async function readReleaseState(packageNames) {
  while (true) {
    try {
      const state = []
      for (const name of packageNames) {
        state.push({
          local: packageVersion(name),
          name,
          ...await npmPackageState(name),
        })
      }
      printReleaseState(state)
      return state
    }
    catch (error) {
      console.error(`版本查询失败：${error.message}`)
      const action = await chooseRetryOrAbort('版本查询失败，请选择操作', '重新请求 npm registry')
      if (action === 'a')
        return undefined
    }
  }
}

export { ensureLogin, npmPackageState, readReleaseState, REGISTRY }
