import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { choosePublishPackages } from './packages.js'
import { applyVersionPlan, confirmVersionPlan } from './plan.js'
import { closePrompt, openPrompt } from './prompt.js'
import { printPublishedInfo, publishPackages, releaseCheck, releasePack } from './publish.js'
import { ensureLogin, readReleaseState } from './registry.js'

/**
 * `pnpm release` 入口：登录 → 选择范围 → 确认版本计划并写入 → 检查 → 预览 → 发布。
 * @returns {Promise<number>} 进程退出状态；0 为全部完成，1 为中止或失败。
 */
async function main() {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    console.log('用法：pnpm release [--help]\n在真实交互终端选择公开包、检查版本和产物，再按提示发布。\nCI、管道或非交互环境不会执行发布；--help 只显示帮助。')
    return 0
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY || process.env.CI) {
    console.error('发布需要真实交互终端。请在本地终端运行 pnpm release；CI 或管道输入不会执行登录、升级或发布。')
    return 1
  }
  openPrompt()
  try {
    console.log('=== zzjtnb lint config 交互式发布 ===')
    if (!(await ensureLogin()))
      return 1

    const packageNames = await choosePublishPackages()
    let state = await readReleaseState(packageNames)
    if (!state)
      return 1
    const plan = await confirmVersionPlan(state)
    if (!plan)
      return 1
    if (!(await applyVersionPlan(state, plan)))
      return 1
    state = await readReleaseState(packageNames)
    if (!state)
      return 1
    // 以写入后的文件为准复核，避免命令成功但包版本与已确认计划不一致。
    const mismatched = state.filter(item => item.local !== plan.get(item.name))
    if (mismatched.length) {
      console.error(`版本写入结果与计划不一致：${mismatched.map(item => `${item.name} 本地 ${item.local} / 计划 ${plan.get(item.name)}`).join('；')}`)
      return 1
    }

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

// 只有作为入口执行时才启动；被导入时不触发交互、登录、版本写入或发布。
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => {
    process.exitCode = code
  }).catch((error) => {
    closePrompt()
    console.error(error)
    process.exitCode = 1
  })
}
