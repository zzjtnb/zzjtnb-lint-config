import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = 'https://registry.npmjs.org/'
const PACKAGE_DIRECTORIES = {
  '@zzjtnb/eslint-config': 'eslint-config',
  '@zzjtnb/stylelint-config': 'stylelint-config',
}
const PACKAGES = Object.keys(PACKAGE_DIRECTORIES)

let prompt

function openPrompt() {
  prompt = createInterface({ input: process.stdin, output: process.stdout })
}

function closePrompt() {
  prompt?.close()
  prompt = undefined
}

async function ask(question) {
  return (await prompt.question(question)).trim()
}

async function choose(question, choices) {
  while (true) {
    const answer = (await ask(question)).toLowerCase()
    if (choices.includes(answer))
      return answer
    console.log(`请输入：${choices.join(' / ')}`)
  }
}

function chooseMenu(question, options) {
  const fallbackQuestion = `${question}\n${options.map(option => `- ${option.label} [${option.key}]：${option.description}`).join('\n')}\n请输入选项：`
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    return choose(fallbackQuestion, options.map(option => option.key))

  closePrompt()
  return new Promise((resolveChoice) => {
    let selected = 0
    let lineCount = 0

    const render = () => {
      if (lineCount)
        process.stdout.write(`\x1B[${lineCount}A\x1B[0J`)
      const lines = [
        `${question}（↑/↓ 选择，Enter 确认）：`,
        ...options.map((option, index) => `${index === selected ? '❯' : ' '} ${option.label} [${option.key}] — ${option.description}`),
      ]
      process.stdout.write(`${lines.join('\n')}\n`)
      lineCount = lines.length
    }

    let cleanup

    const onKeypress = (_, key) => {
      if (key.name === 'up')
        selected = (selected + options.length - 1) % options.length
      else if (key.name === 'down')
        selected = (selected + 1) % options.length
      else if (key.name === 'return') {
        const value = options[selected].key
        cleanup()
        resolveChoice(value)
        return
      }
      else if (key.ctrl && key.name === 'c') {
        cleanup()
        process.kill(process.pid, 'SIGINT')
        return
      }
      else {
        const matched = options.find(option => option.key === key.name)
        if (matched) {
          cleanup()
          resolveChoice(matched.key)
          return
        }
      }
      render()
    }

    cleanup = () => {
      process.stdin.off('keypress', onKeypress)
      process.stdin.setRawMode(false)
      process.stdout.write('\x1B[?25h\n')
      openPrompt()
    }

    emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('keypress', onKeypress)
    process.stdout.write('\x1B[?25l')
    render()
  })
}

function chooseVersionAction() {
  return chooseMenu('请选择版本升级级别', [
    { description: '首次发布推荐，或修复问题和小幅调整', key: 'p', label: 'patch：补丁版本' },
    { description: '新增向后兼容功能', key: 'm', label: 'minor：次版本' },
    { description: '存在不兼容变更', key: 'j', label: 'major：主版本' },
    { description: '退出本次发布，不修改版本', key: 'a', label: '中止：取消发布' },
  ])
}

async function choosePublishPackages() {
  const selection = await chooseMenu('请选择本次发布范围', [
    { description: '按顺序检查并发布 ESLint 和 Stylelint 两个包', key: 'b', label: '发布两个包' },
    { description: '只检查并发布 @zzjtnb/eslint-config', key: 'e', label: '仅发布 ESLint' },
    { description: '只检查并发布 @zzjtnb/stylelint-config', key: 's', label: '仅发布 Stylelint' },
  ])
  if (selection === 'e')
    return ['@zzjtnb/eslint-config']
  if (selection === 's')
    return ['@zzjtnb/stylelint-config']
  return PACKAGES
}

function chooseRetryOrAbort(question, retryDescription) {
  return chooseMenu(question, [
    { description: retryDescription, key: 'r', label: '重试' },
    { description: '退出发布流程', key: 'a', label: '中止' },
  ])
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      stdio: options.stdio ?? 'inherit',
    })
    child.on('error', reject)
    child.on('close', code => resolveRun(code ?? 1))
  })
}

/**
 * 在真实终端中发布单个包。
 *
 * 不通过 `pnpm --filter ... run` 或管道转发发布命令，否则 npm 要求 OTP
 * 时会判断当前进程不是交互终端，直接报 `ERR_PNPM_OTP_NON_INTERACTIVE`。
 */
async function publishPackage(packageName) {
  closePrompt()
  try {
    return await run('pnpm', [
      'publish',
      '--access',
      'public',
      '--tag',
      'latest',
      '--registry',
      REGISTRY,
      '--no-git-checks',
    ], {
      cwd: packageVersionPath(packageName),
    })
  }
  finally {
    openPrompt()
  }
}

async function capture(command, args) {
  return new Promise((resolveCapture, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', code => resolveCapture({ code: code ?? 1, stderr, stdout }))
  })
}

function packageVersion(packageName) {
  const packageDirectory = PACKAGE_DIRECTORIES[packageName]
  if (!packageDirectory)
    throw new Error(`未知的发布包：${packageName}`)
  const packagePath = resolve(ROOT, 'packages', packageDirectory, 'package.json')
  return JSON.parse(readFileSync(packagePath, 'utf8')).version
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (!match)
    throw new Error(`不支持的版本号：${version}`)
  return match.slice(1).map(Number)
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left)
  const rightParts = parseVersion(right)
  for (const index of [0, 1, 2]) {
    if (leftParts[index] !== rightParts[index])
      return leftParts[index] - rightParts[index]
  }
  return 0
}

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

function packageVersionPath(packageName) {
  const packageDirectory = PACKAGE_DIRECTORIES[packageName]
  if (!packageDirectory)
    throw new Error(`未知的发布包：${packageName}`)
  return resolve(ROOT, 'packages', packageDirectory)
}

async function npmUser() {
  const result = await capture('pnpm', ['whoami', '--registry', REGISTRY])
  return result.code === 0 ? result.stdout.trim() : undefined
}

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

    closePrompt()
    const code = await run('pnpm', ['login', '--registry', REGISTRY])
    openPrompt()
    if (code !== 0)
      console.log('npm 登录失败。')
  }
}

async function npmPackageState(packageName) {
  const response = await fetch(`${REGISTRY}${encodeURIComponent(packageName)}`)
  if (response.status === 404)
    return { notFound: true, remote: undefined, unpublishedVersions: [] }
  if (!response.ok)
    throw new Error(`查询 ${packageName} 失败：HTTP ${response.status}`)

  const metadata = await response.json()
  return {
    notFound: false,
    remote: metadata['dist-tags']?.latest,
    unpublishedVersions: metadata.time?.unpublished?.versions ?? [],
  }
}

async function releaseState(packageNames) {
  const state = []
  for (const name of packageNames) {
    const npmState = await npmPackageState(name)
    state.push({
      local: packageVersion(name),
      name,
      ...npmState,
    })
  }
  return state
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

async function readReleaseState(packageNames) {
  while (true) {
    try {
      const state = await releaseState(packageNames)
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

async function bumpVersions(packageNames, level) {
  if (packageNames.length === PACKAGES.length)
    return run('pnpm', ['run', `version:${level}`])

  const code = await run('pnpm', [
    '--dir',
    packageVersionPath(packageNames[0]),
    'version',
    level,
    '--no-git-tag-version',
    '--no-git-checks',
  ])
  if (code !== 0)
    return code
  return run('pnpm', ['install'])
}

async function updateVersions(state, packageNames) {
  while (state.some(item => item.local === '0.0.0' || (item.remote && compareVersions(item.local, item.remote) <= 0))) {
    console.log('\n至少有一个发布包仍是初始版本或没有高于 npm 版本。接下来只升级本次选择的发布包。')
    const action = await chooseVersionAction()
    if (action === 'a')
      return undefined

    const level = action === 'p' ? 'patch' : action === 'm' ? 'minor' : 'major'
    const code = await bumpVersions(packageNames, level)
    if (code !== 0) {
      const retry = await chooseRetryOrAbort('版本升级失败，请选择操作', '再次执行版本升级命令')
      if (retry === 'a')
        return undefined
    }
    else {
      state = await readReleaseState(packageNames)
      if (!state)
        return undefined
    }
  }
  return state
}

async function confirmUnpublishedVersions(state, packageNames) {
  while (true) {
    const blocked = state.filter(item => item.unpublishedVersions.includes(item.local))
    if (!blocked.length)
      return state

    console.warn('\n以下本地版本曾经发布后被删除，npm 不允许复用这些版本号：')
    for (const item of blocked)
      console.warn(`- ${item.name}@${item.local}`)

    const action = await chooseMenu('请修改被占用的版本号后再发布', [
      { description: '逐个输入新的 x.y.z 版本号，并重新检查', key: 'e', label: '修改版本' },
      { description: '退出发布流程，不修改当前文件', key: 'a', label: '中止' },
    ])
    if (action === 'a')
      return undefined

    for (const item of blocked) {
      if (!(await editPackageVersion(item.name)))
        return undefined
    }
    state = await readReleaseState(packageNames)
    if (!state)
      return undefined
  }
}

async function editPackageVersion(packageName) {
  while (true) {
    const version = await ask(`请输入 ${packageName} 的正确版本号（x.y.z）：`)
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      console.log('版本号格式无效，请使用类似 0.0.2 的三段式版本号。')
      continue
    }

    const code = await run('pnpm', [
      '--dir',
      packageVersionPath(packageName),
      'version',
      version,
      '--no-git-tag-version',
      '--no-git-checks',
    ])
    if (code === 0)
      return true

    const action = await chooseRetryOrAbort(`${packageName} 版本修改失败，请选择操作`, '重新输入并写入版本号')
    if (action === 'a')
      return false
  }
}

async function confirmAheadVersions(state) {
  while (true) {
    const ahead = state.filter(item => (
      item.remote
      && compareVersions(item.local, item.remote) > 0
      && !isNextVersion(item.local, item.remote)
    ))
    if (!ahead.length)
      return state

    console.warn('\n发现本地版本跳过了 npm 版本。可能是未发布的中间版本，也可能是手动填写错误：')
    for (const item of ahead)
      console.warn(`- ${item.name}: npm ${item.remote} / 本地 ${item.local}`)

    const action = await chooseMenu('请确认跳过版本的处理方式', [
      { description: '确认中间版本不需要发布，按当前版本继续', key: 'c', label: '继续发布' },
      { description: '重新输入可用的版本号，并再次检查状态', key: 'e', label: '修改版本' },
      { description: '退出发布流程，保留当前文件内容', key: 'a', label: '中止' },
    ])
    if (action === 'c')
      return state
    if (action === 'a')
      return undefined

    for (const item of ahead) {
      if (!(await editPackageVersion(item.name)))
        return undefined
    }
    state = await readReleaseState(state.map(item => item.name))
    if (!state)
      return undefined
  }
}

async function requiredStep(label, args) {
  while (true) {
    console.log(`\n开始：${label}`)
    const code = await run('pnpm', args)
    if (code === 0)
      return true
    const action = await chooseRetryOrAbort(`${label}失败，请选择操作`, '重新执行当前检查')
    if (action === 'a')
      return false
  }
}

async function requiredSteps(steps) {
  for (const [label, args] of steps) {
    if (!(await requiredStep(label, args)))
      return false
  }
  return true
}

function packageCheckSteps(packageNames) {
  return packageNames.flatMap((packageName) => {
    const packageDirectory = PACKAGE_DIRECTORIES[packageName]
    return [
      [`${packageName} 构建`, ['--filter', packageName, 'run', 'build']],
      [`${packageName} 类型检查`, ['--filter', packageName, 'run', 'typecheck']],
      [`${packageName} ESLint 检查`, ['--filter', packageName, 'run', 'lint:eslint']],
      [`${packageName} Markdown 检查`, ['exec', 'markdownlint-cli2', '--config', '.markdownlint-cli2.jsonc', `packages/${packageDirectory}/**/*.md`]],
    ]
  })
}

async function releaseCheck(packageNames) {
  if (packageNames.length === PACKAGES.length)
    return requiredStep('发布前完整检查', ['run', 'release:check'])
  return requiredSteps(packageCheckSteps(packageNames))
}

async function releasePack(packageNames) {
  if (packageNames.length === PACKAGES.length)
    return requiredStep('发布包内容检查', ['run', 'release:pack'])
  return requiredSteps(packageNames.map(packageName => [
    `${packageName} 发布包内容检查`,
    ['--filter', packageName, 'run', 'release:pack'],
  ]))
}

async function publishPackages(state) {
  for (const item of state) {
    let remote
    while (true) {
      try {
        remote = (await npmPackageState(item.name)).remote
        break
      }
      catch (error) {
        console.error(`${item.name} 版本查询失败：${error.message}`)
        const action = await chooseRetryOrAbort(`${item.name} 版本查询失败，请选择操作`, '重新请求 npm registry')
        if (action === 'a')
          return false
      }
    }
    if (remote && compareVersions(item.local, remote) <= 0) {
      if (compareVersions(item.local, remote) === 0)
        console.log(`\n${item.name}@${item.local} 已发布，跳过重复发布。`)
      else
        console.log(`\n${item.name} 本地版本低于 npm 版本，跳过并需要人工处理：${item.local} < ${remote}`)
      if (compareVersions(item.local, remote) < 0)
        return false
      continue
    }

    while (true) {
      console.log(`\n准备发布 ${item.name}@${item.local}`)
      const code = await publishPackage(item.name)
      if (code === 0)
        break
      console.error('\n发布命令失败；如果终端要求 OTP，请直接在上方 npm 提示中输入一次性验证码。')
      const action = await chooseRetryOrAbort(`${item.name} 发布失败，请选择操作`, '重新执行当前包的发布命令；已成功发布的包不会回滚')
      if (action === 'a')
        return false
    }
  }
  return true
}

function printPublishedInfo(packageNames) {
  console.log('\n发布命令已完成。npm 页面和 registry 版本可能需要一段时间同步，请使用以下地址或命令检查：')
  for (const packageName of packageNames) {
    console.log(`- ${packageName}`)
    console.log(`  页面：https://www.npmjs.com/package/${packageName}`)
    console.log(`  命令：pnpm view ${packageName} version --registry ${REGISTRY}`)
  }
}

async function main() {
  openPrompt()
  try {
    console.log('=== zzjtnb lint config 交互式发布 ===')
    if (!(await ensureLogin()))
      return 1

    const packageNames = await choosePublishPackages()
    let state = await readReleaseState(packageNames)
    if (!state)
      return 1
    state = await confirmUnpublishedVersions(state, packageNames)
    if (!state)
      return 1
    state = await confirmAheadVersions(state)
    if (!state)
      return 1
    state = await updateVersions(state, packageNames)
    if (!state)
      return 1
    state = await confirmUnpublishedVersions(state, packageNames)
    if (!state)
      return 1

    if (!(await releaseCheck(packageNames)))
      return 1
    if (!(await releasePack(packageNames)))
      return 1
    if (!(await publishPackages(state)))
      return 1

    printPublishedInfo(packageNames)
    console.log('\n全部发布命令已完成。')
    return 0
  }
  finally {
    closePrompt()
  }
}

main().then((code) => {
  process.exitCode = code
}).catch((error) => {
  closePrompt()
  console.error(error)
  process.exitCode = 1
})
