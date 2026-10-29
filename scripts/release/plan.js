import { requiredStep, run } from './command.js'
import { packageDirectory } from './packages.js'
import { ask, chooseMenu } from './prompt.js'
import { compareVersions, incrementVersion, isNextVersion, parseVersion, unifiedVersionChoices, versionProblem } from './version.js'

/**
 * @typedef {object} PackageState 所选包的本地版本与 registry 状态。
 * @property {string} name 公开包名。
 * @property {string} local package.json 中的当前版本。
 * @property {string} [remote] npm latest；从未发布时省略。
 * @property {string[]} publishedVersions npm 上已发布的全部版本。
 * @property {string[]} unpublishedVersions npm 记录的曾发布后取消的版本。
 */

const LEVEL_OPTIONS = [
  { description: '修复问题和小幅调整', key: 'p', level: 'patch' },
  { description: '新增向后兼容功能', key: 'm', level: 'minor' },
  { description: '存在不兼容变更', key: 'j', level: 'major' },
]

/**
 * 读取一个完整稳定版本；直接回车表示返回上一级菜单。
 * @param {string} question 输入提示。
 * @returns {Promise<string | undefined>} 合法版本，或用户选择返回时的 undefined。
 */
async function askVersion(question) {
  while (true) {
    const version = await ask(question)
    if (!version)
      return undefined
    try {
      parseVersion(version)
      return version
    }
    catch (error) {
      console.log(error.message)
    }
  }
}

function versionProblems(state, plan) {
  return state.flatMap((item) => {
    const problem = versionProblem(item, plan.get(item.name))
    return problem
      ? [`${item.name}@${plan.get(item.name)}：${problem}`]
      : []
  })
}

/**
 * 逐包选择目标版本，各包可以不同号。
 * @param {PackageState[]} state 所选包的本地与 registry 状态。
 * @returns {Promise<Map<string, string> | undefined>} 包名到目标版本；中止时返回 undefined。
 */
async function choosePackageVersions(state) {
  const plan = new Map()
  for (const item of state) {
    const version = await choosePackageVersion(item)
    if (!version)
      return undefined
    plan.set(item.name, version)
  }
  return plan
}

/** 选择本地与 registry 中较新的版本作为递增起点。 */
function versionBase(item) {
  if (item.remote && compareVersions(item.remote, item.local) > 0)
    return item.remote
  return item.local
}

/** 统一和逐包选择复用同一快捷键解释，返回上一级时不产生版本。 */
async function versionForAction(action, current, choices, question) {
  if (action === 'k')
    return current
  const option = LEVEL_OPTIONS.find(option => option.key === action)
  if (option)
    return choices[option.level]
  return askVersion(question)
}

/** 为单个包选择可发布版本，取消时返回 undefined。 */
async function choosePackageVersion(item) {
  const base = versionBase(item)
  while (true) {
    const options = [
      ...(versionProblem(item, item.local)
        ? []
        : [
            { description: '本地版本已可发布，不改写', key: 'k', label: `保持 ${item.local}` },
          ]),
      ...LEVEL_OPTIONS.map(option => ({ ...option, label: `${option.level}：${incrementVersion(base, option.level)}` })),
      { description: '输入完整的 x.y.z 版本号', key: 'c', label: '自定义版本' },
      { description: '退出发布流程，不修改版本', key: 'a', label: '中止' },
    ]
    const action = await chooseMenu(`请选择 ${item.name} 的版本（本地 ${item.local} / npm ${item.remote ?? '未发布'}）`, options)
    if (action === 'a')
      return undefined
    const version = await versionForAction(action, item.local, Object.fromEntries(LEVEL_OPTIONS.map(option => [
      option.level,
      incrementVersion(base, option.level),
    ])), `请输入 ${item.name} 的版本号（x.y.z，直接回车返回）：`)
    if (!version)
      continue
    const problem = versionProblem(item, version)
    if (!problem) {
      return version
    }
    console.error(`${item.name}@${version}：${problem}`)
  }
}

/** 多包发布显示统一版本提示，单包省略该前缀。 */
function versionScope(state) {
  return state.length > 1
    ? '统一'
    : ''
}

/** 根据可用版本构造统一发布菜单，不执行交互。 */
function versionMenu(state, choices, scope) {
  return [
    ...(choices.current
      ? [
          {
            description: state.every(item => item.local === choices.current)
              ? '本地版本已可发布，不改写'
              : '复用已写入的最高本地版本，只改写其余包',
            key: 'k',
            label: `使用${scope}版本 ${choices.current}`,
          },
        ]
      : []),
    ...LEVEL_OPTIONS.map(option => ({ ...option, label: `${scope}${option.level}：${choices[option.level]}` })),
    { description: '输入完整的 x.y.z 版本号', key: 'c', label: `自定义${scope}版本` },
    ...(state.length > 1
      ? [
          { description: '每个包单独保持、递增或输入版本', key: 'i', label: '按各包分别设置' },
        ]
      : []),
    { description: '退出发布流程，不修改版本', key: 'a', label: '中止' },
  ]
}

/**
 * 交互确定本次发布版本。默认所选包统一同号；也可自定义统一版本或逐包设置。
 * 只生成版本计划，不写入文件。
 * @param {PackageState[]} state 所选包的本地与 registry 状态。
 * @returns {Promise<Map<string, string> | undefined>} 包名到目标版本；中止时返回 undefined。
 */
async function chooseVersionPlan(state) {
  while (true) {
    const choices = unifiedVersionChoices(state)
    const scope = versionScope(state)
    const recommended = choices.current ?? choices.patch
    const action = await chooseMenu(`默认${scope}版本为 ${recommended}，是否使用？`, versionMenu(state, choices, scope))
    if (action === 'a')
      return undefined
    if (action === 'i')
      return choosePackageVersions(state)

    const version = await versionForAction(action, choices.current, choices, `请输入${scope}版本号（x.y.z，直接回车返回）：`)
    if (!version)
      continue
    const plan = new Map(state.map(item => [item.name, version]))
    const problems = versionProblems(state, plan)
    if (!problems.length)
      return plan
    console.error(`\n该版本不能用于以下包，请重新选择：\n${problems.map(problem => `- ${problem}`).join('\n')}`)
  }
}

function printVersionPlan(state, plan) {
  console.log('\n版本计划：')
  for (const item of state) {
    const version = plan.get(item.name)
    const change = version === item.local
      ? `保持 ${version}`
      : `${item.local} → ${version}`
    // 统一同号常会让版本较低的包跳过中间版本；这里明确提示，但不阻止有意的选择。
    const skipped = item.remote && !isNextVersion(version, item.remote)
      ? '，跳过中间版本'
      : ''
    console.log(`- ${item.name}: ${change}（npm ${item.remote ?? '未发布'}${skipped}）`)
  }
}

/**
 * 选择并确认版本计划，确认前不修改任何文件。
 * @param {PackageState[]} state 所选包的本地与 registry 状态。
 * @returns {Promise<Map<string, string> | undefined>} 已确认的版本计划；中止时返回 undefined。
 */
async function confirmVersionPlan(state) {
  while (true) {
    const plan = await chooseVersionPlan(state)
    if (!plan)
      return undefined
    printVersionPlan(state, plan)
    const action = await chooseMenu('确认版本计划', [
      { description: '写入版本并同步依赖，然后进入发布前检查', key: 'y', label: '确认' },
      { description: '返回版本选择', key: 'r', label: '重新选择' },
      { description: '退出发布流程，不修改版本', key: 'a', label: '中止' },
    ])
    if (action === 'y')
      return plan
    if (action === 'a')
      return undefined
  }
}

/**
 * 按版本计划写入版本并同步工作区依赖，不执行 Git 操作。
 * 任一包写入失败立即停止：已写入的包不回滚，也不重复改写；依赖同步失败只重试 install。
 * @param {Array<{name: string, local: string}>} state 写入前的本地版本。
 * @param {Map<string, string>} plan 已确认的包名到目标版本。
 * @returns {Promise<boolean>} 所有改写与依赖同步完成时返回 true。
 */
async function applyVersionPlan(state, plan) {
  const changes = state.filter(item => plan.get(item.name) !== item.local)
  if (!changes.length)
    return true
  for (const item of changes) {
    const code = await run('pnpm', [
      '--dir',
      packageDirectory(item.name),
      'version',
      plan.get(item.name),
      '--no-git-tag-version',
      '--no-git-checks',
    ])
    if (code !== 0) {
      console.error(`${item.name} 版本写入失败，本次流程已停止。已写入的版本不会回滚；请核对各包 package.json，修复后重新运行 pnpm release，并选择沿用已写入的版本或输入目标版本，不要整批再次递增。`)
      return false
    }
  }
  return requiredStep('版本写入后的依赖同步', ['install'])
}

export { applyVersionPlan, chooseVersionPlan, confirmVersionPlan }
