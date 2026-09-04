import { spawn } from 'node:child_process'

import { ROOT } from './packages.js'
import { chooseRetryOrAbort } from './prompt.js'

/**
 * 运行子进程，默认在仓库根目录并继承终端。
 * @param {string} command 可执行文件名。
 * @param {string[]} args 参数数组；不经过 shell 拼接。
 * @param {{cwd?: string}} [options] cwd 为工作目录，默认仓库根目录。
 * @returns {Promise<number>} 退出状态；被信号终止时为 1。
 */
function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: options.cwd ?? ROOT, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', code => resolveRun(code ?? 1))
  })
}

/**
 * 在仓库根目录运行子进程并收集输出，不继承终端。
 * @param {string} command 可执行文件名。
 * @param {string[]} args 参数数组；不经过 shell 拼接。
 * @returns {Promise<{code: number, stdout: string, stderr: string}>} 退出状态与完整输出。
 */
function capture(command, args) {
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

/**
 * 运行必须成功的 pnpm 步骤；失败时只允许重试当前步骤或中止，不提供跳过。
 * @param {string} label 步骤说明。
 * @param {string[]} args pnpm 参数。
 * @returns {Promise<boolean>} 成功返回 true，用户中止返回 false。
 */
async function requiredStep(label, args) {
  while (true) {
    console.log(`\n开始：${label}`)
    const code = await run('pnpm', args)
    if (code === 0)
      return true
    const action = await chooseRetryOrAbort(`${label}失败，请选择操作`, '重新执行当前步骤')
    if (action === 'a')
      return false
  }
}

/**
 * 按顺序运行多个必须成功的步骤，任一步中止即停止。
 * @param {Array<[string, string[]]>} steps 步骤说明与 pnpm 参数。
 * @returns {Promise<boolean>} 全部成功返回 true。
 */
async function requiredSteps(steps) {
  for (const [label, args] of steps) {
    if (!(await requiredStep(label, args)))
      return false
  }
  return true
}

export { capture, requiredStep, requiredSteps, run }
