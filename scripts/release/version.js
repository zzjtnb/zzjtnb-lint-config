// 稳定版本的解析、比较与可用性判断；纯函数，不读文件、不访问网络。

/**
 * 解析发布流程支持的稳定版本号，拒绝前导零、预发布及额外后缀。
 * @param {string} version 完整的 x.y.z 版本号。
 * @returns {number[]} 主、次、补丁版本数字。
 * @throws {Error} 格式不符或数字超出安全整数范围时抛出。
 */
function parseVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version)
  if (!match)
    throw new Error(`不支持的版本号：${version}`)
  const parts = match.slice(1).map(Number)
  if (!parts.every(Number.isSafeInteger))
    throw new Error(`版本号超出安全整数范围：${version}`)
  return parts
}

/**
 * 按数字比较两个受支持的稳定版本，不按字符串字典序排序。
 * @param {string} left 待比较的完整稳定版本。
 * @param {string} right 比较基准的完整稳定版本。
 * @returns {number} 小于、等于或大于零，分别表示较早、相同或较晚。
 * @throws {Error} 任一版本不满足稳定版本契约时抛出。
 */
function compareVersions(left, right) {
  const leftParts = parseVersion(left)
  const rightParts = parseVersion(right)
  for (const index of [0, 1, 2]) {
    if (leftParts[index] !== rightParts[index])
      return leftParts[index] - rightParts[index]
  }
  return 0
}

/**
 * 判断本地版本是否为远程版本的一次标准主、次或补丁递增。
 * @param {string} local 本次准备发布的完整稳定版本。
 * @param {string} remote registry 返回的完整稳定版本。
 * @returns {boolean} 是否恰好递增一级，且更低级版本位按规则归零。
 */
function isNextVersion(local, remote) {
  const [localMajor, localMinor, localPatch] = parseVersion(local)
  const [remoteMajor, remoteMinor, remotePatch] = parseVersion(remote)

  return (
    localMajor === remoteMajor
    && localMinor === remoteMinor
    && localPatch === remotePatch + 1
  ) || (
    localMajor === remoteMajor
    && localMinor === remoteMinor + 1
    && localPatch === 0
  ) || (
    localMajor === remoteMajor + 1
    && localMinor === 0
    && localPatch === 0
  )
}

/**
 * 按 SemVer 级别递增稳定版本，较低版本位归零。
 * @param {string} version 当前完整稳定版本。
 * @param {'patch' | 'minor' | 'major'} level 递增级别。
 * @returns {string} 递增后的完整稳定版本。
 */
function incrementVersion(version, level) {
  const [major, minor, patch] = parseVersion(version)
  if (level === 'major')
    return `${major + 1}.0.0`
  if (level === 'minor')
    return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function highestVersion(versions) {
  return versions.reduce((highest, version) => compareVersions(version, highest) > 0
    ? version
    : highest)
}

/**
 * 核对某个版本能否作为该包本次发布的版本。
 * @param {{remote?: string, publishedVersions: string[], unpublishedVersions: string[]}} item 包在 registry 中的状态。
 * @param {string} version 拟发布的完整稳定版本。
 * @returns {string | undefined} 不能使用的原因；可以使用时返回 undefined。
 */
function versionProblem(item, version) {
  if (version === '0.0.0')
    return '0.0.0 是初始占位版本，不能发布'
  // registry 数据不可变：已发布或曾取消发布的版本号都不能再次使用。
  if (item.unpublishedVersions.includes(version))
    return `npm 记录 ${version} 曾发布后被取消，版本号不可复用`
  if (item.publishedVersions.includes(version))
    return `npm 已存在 ${version}，不能覆盖`
  if (item.remote && compareVersions(version, item.remote) <= 0)
    return `必须高于 npm latest ${item.remote}`
  return undefined
}

/**
 * 计算所选包统一版本的候选值，只用于展示菜单，不写入文件。
 * @param {Array<{local: string, remote?: string, publishedVersions: string[], unpublishedVersions: string[]}>} state 所选包的本地与 registry 状态。
 * @returns {{current?: string, patch: string, minor: string, major: string}} current 是所选包中可直接统一使用的最高本地版本，不存在时省略；patch / minor / major 基于所有本地与 npm latest 中的最高版本递增。
 */
function unifiedVersionChoices(state) {
  const base = highestVersion(state.flatMap(item => item.remote
    ? [item.local, item.remote]
    : [item.local]))
  // 已有包写成新版本时（例如上次中途停止），直接复用它统一，避免再次递增。
  const current = state.some(item => item.local === base) && state.every(item => !versionProblem(item, base))
    ? base
    : undefined
  return {
    current,
    patch: incrementVersion(base, 'patch'),
    minor: incrementVersion(base, 'minor'),
    major: incrementVersion(base, 'major'),
  }
}

export { compareVersions, incrementVersion, isNextVersion, parseVersion, unifiedVersionChoices, versionProblem }
