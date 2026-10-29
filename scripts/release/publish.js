import { requiredSteps, run } from './command.js'
import { packageCheckSteps, packageDirectory } from './packages.js'
import { chooseRetryOrAbort, handOverTerminal } from './prompt.js'
import { npmPackageState, REGISTRY } from './registry.js'
import { compareVersions } from './version.js'

/**
 * 按所选包的实际产物执行发布前检查；失败只能重试当前步骤或中止。
 * @param {string[]} packageNames 本次选择的公开包名。
 * @returns {Promise<boolean>} 全部通过返回 true。
 */
function releaseCheck(packageNames) {
  return requiredSteps(packageCheckSteps(packageNames))
}

/**
 * 逐包执行 pnpm pack --dry-run预览发布内容，不上传。
 * @param {string[]} packageNames 本次选择的公开包名。
 * @returns {Promise<boolean>} 全部完成返回 true。
 */
function releasePack(packageNames) {
  return requiredSteps(packageNames.map(packageName => [
    `${packageName} 发布包内容检查`,
    [
      '--dir',
      packageDirectory(packageName),
      'pack',
      '--dry-run',
    ],
  ]))
}

/**
 * 在真实终端中发布单个包。
 *
 * 不通过 `pnpm --filter ... run` 或管道转发发布命令，否则 npm 要求 OTP
 * 时会判断当前进程不是交互终端，直接报 `ERR_PNPM_OTP_NON_INTERACTIVE`。
 * @param {string} packageName 公开包名。
 * @returns {Promise<number>} pnpm publish 的退出状态；非零不代表 registry 一定未接收。
 */
function publishPackage(packageName) {
  return handOverTerminal(() => run('pnpm', [
    'publish',
    '--access',
    'public',
    '--tag',
    'latest',
    '--registry',
    REGISTRY,
    '--no-git-checks',
  ], {
    cwd: packageDirectory(packageName),
  }))
}

/**
 * 逐包发布，并在每次尝试前重新核对 registry 的版本占用状态。
 * @param {Array<{name: string, local: string}>} state 已确认的包名和本地稳定版本。
 * @returns {Promise<boolean>} 所有包完成发布或已确认为 latest 时返回 true；中止或版本冲突返回 false。
 */
async function publishPackages(state) {
  for (const item of state) {
    if (!await publishSelected(item))
      return false
  }
  return true
}

/** 根据 registry 状态区分已发布、版本冲突和可继续发布。 */
function publicationStatus(item, npmState) {
  const { remote, publishedVersions, unpublishedVersions } = npmState
  if (remote && compareVersions(item.local, remote) === 0) {
    console.log(`\n${item.name}@${item.local} 已被 registry 确认为 latest，跳过重复发布。`)
    return 'done'
  }
  if (remote && compareVersions(item.local, remote) < 0) {
    console.error(`\n${item.name} 本地版本低于 npm 版本，需要人工处理：${item.local} < ${remote}`)
    return 'abort'
  }
  if (publishedVersions.includes(item.local) || unpublishedVersions.includes(item.local)) {
    console.error(`\n${item.name}@${item.local} 的版本号已被占用，不能重复发布。请核对 registry 版本与分发标签，再选择未使用的版本号。`)
    return 'abort'
  }

  return 'ready'
}

/** 查询单个包的 registry 状态并发布；失败后由用户决定是否重试。 */
async function publishSelected(item) {
  while (true) {
    let npmState
    try {
      npmState = await npmPackageState(item.name)
    }
    catch (error) {
      console.error(`${item.name} 版本查询失败：${error.message}`)
      const action = await chooseRetryOrAbort(`${item.name} 版本查询失败，请选择操作`, '重新请求 npm registry；状态未确认前不会发布')
      if (action === 'a')
        return false
      continue
    }

    const status = publicationStatus(item, npmState)
    if (status === 'done')
      return true
    if (status === 'abort')
      return false

    console.log(`\n准备发布 ${item.name}@${item.local}`)
    const code = await publishPackage(item.name)
    if (code === 0)
      return true
      // 命令失败不代表 registry 未接收写入；重试必须回到上面的状态查询。
    console.error('\n发布命令失败；如果终端要求 OTP，请直接在上方 npm 提示中输入一次性验证码。')
    const action = await chooseRetryOrAbort(`${item.name} 发布失败，请选择操作`, '重新核对 registry 后再决定是否发布；已成功发布的包不会回滚')
    if (action === 'a')
      return false
  }
}

/**
 * 打印发布后的查询入口；只是提示，不代表已完成远程核验。
 * @param {string[]} packageNames 本次发布的公开包名。
 */
function printPublishedInfo(packageNames) {
  console.log('\n发布命令已完成。npm 页面和 registry 版本可能需要一段时间同步，请使用以下地址或命令检查：')
  for (const packageName of packageNames) {
    console.log(`- ${packageName}`)
    console.log(`  页面：https://www.npmjs.com/package/${packageName}`)
    console.log(`  命令：pnpm view ${packageName} version --registry ${REGISTRY}`)
  }
}

export { printPublishedInfo, publishPackages, releaseCheck, releasePack }
