import process from 'node:process'
import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'

// 整个发布流程共用一个 readline；子进程需要接管终端时先关闭，结束后重新打开。
let prompt

function openPrompt() {
  prompt = createInterface({ input: process.stdin, output: process.stdout })
}

function closePrompt() {
  prompt?.close()
  prompt = undefined
}

/**
 * 读取一行输入并去除首尾空白；尚未打开 readline 时自动打开。
 * @param {string} question 输入提示。
 * @returns {Promise<string>} 去除首尾空白后的输入。
 */
async function ask(question) {
  if (!prompt)
    openPrompt()
  return (await prompt.question(question)).trim()
}

/**
 * 把终端交给需要直接交互的子进程（登录、OTP 等），结束后恢复 readline。
 * @template T
 * @param {() => Promise<T>} task 接管终端期间执行的任务。
 * @returns {Promise<T>} 任务结果；任务失败时仍恢复 readline 后再抛出。
 */
async function handOverTerminal(task) {
  closePrompt()
  try {
    return await task()
  }
  finally {
    openPrompt()
  }
}

async function choose(question, choices) {
  while (true) {
    const answer = (await ask(question)).toLowerCase()
    if (choices.includes(answer))
      return answer
    console.log(`请输入：${choices.join(' / ')}`)
  }
}

/**
 * 显示单选菜单。真实终端使用方向键与快捷键，首项为 Enter 的默认选择；非 TTY 时退回逐行输入快捷键。
 * @param {string} question 菜单标题。
 * @param {Array<{key: string, label: string, description: string}>} options 按显示顺序排列的选项，key 为单字符快捷键。
 * @returns {Promise<string>} 选中项的 key。
 */
function chooseMenu(question, options) {
  const fallbackQuestion = `${question}\n${options.map(option => `- ${option.label} [${option.key}]：${option.description}`).join('\n')}\n请输入选项：`
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    return choose(fallbackQuestion, options.map(option => option.key))

  return terminalMenu(question, options)
}

/** 在真实终端内维护选择、按键监听与退出后的终端恢复。 */
function terminalMenu(question, options) {
  closePrompt()
  return new Promise((resolveChoice) => {
    let selected = 0
    let lineCount = 0

    const render = () => {
      if (lineCount)
        process.stdout.write(`\x1B[${lineCount}A\x1B[0J`)
      const lines = [
        `${question}（↑/↓ 选择，Enter 确认）：`,
        ...options.map((option, index) => `${index === selected
          ? '❯'
          : ' '} ${option.label} [${option.key}] · ${option.description}`),
      ]
      process.stdout.write(`${lines.join('\n')}\n`)
      lineCount = lines.length
    }

    let cleanup

    const onKeypress = (_, key) => {
      if (key.name === 'up') {
        selected = (selected + options.length - 1) % options.length
      }
      else if (key.name === 'down') {
        selected = (selected + 1) % options.length
      }
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

/**
 * 显示“重试 / 中止”菜单。
 * @param {string} question 菜单标题。
 * @param {string} retryDescription 重试项说明，写明重试会做什么。
 * @returns {Promise<'r' | 'a'>} r 表示重试，a 表示中止。
 */
function chooseRetryOrAbort(question, retryDescription) {
  return chooseMenu(question, [
    { description: retryDescription, key: 'r', label: '重试' },
    { description: '退出发布流程', key: 'a', label: '中止' },
  ])
}

export { ask, chooseMenu, chooseRetryOrAbort, closePrompt, handOverTerminal, openPrompt }
