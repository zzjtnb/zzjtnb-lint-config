/** 回收生成资源、空目录及非空目录中多余的 Git 占位文件。 */
import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs, promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const rootDir = resolve(import.meta.dirname, '../..')
const targets = new Set([
  '.cache',
  '.turbo',
  'coverage',
  'dist',
  'dist.zip',
  'node_modules',
])
const skipDirs = new Set([
  '.DS_Store',
  '.git',
  '.idea',
  '.tmp',
  '.vscode',
])

/** 使用系统回收站；回收失败向上传递，不回退到永久删除。 */
async function moveToTrash(itemPath) {
  await execFileAsync('trash', [itemPath])
  console.log(`已移入回收站：\n${itemPath}`)
}

/** 根据清理后的目录状态回收空目录和冗余占位文件。 */
async function cleanPlaceholders(currentDir, entries) {
  // 子目录清理后重新判断，不依赖扫描前的快照；只有占位文件的目录仍需保留。
  const remaining = await readdir(currentDir)
  if (remaining.length > 1 && entries.some(entry => entry.name === '.gitkeep' && entry.isFile()))
    await moveToTrash(join(currentDir, '.gitkeep'))
  if (currentDir !== rootDir && remaining.length === 0)
    await moveToTrash(currentDir)
}

/** 自底向上清理；锁文件选项只对当前层生效，不传给子目录。 */
async function cleanDirectory(currentDir, deleteLock = false) {
  const entries = await readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const itemPath = join(currentDir, entry.name)
    if (entry.name.startsWith('.')) {
      console.log(`发现隐藏内容${skipDirs.has(entry.name)
        ? '（跳过）'
        : ''}：\n${itemPath}`)
    }
    if (skipDirs.has(entry.name))
      continue

    if (targets.has(entry.name)
      || (entry.name === 'cache' && basename(currentDir) === '.vitepress')
      || (deleteLock && entry.name === 'pnpm-lock.yaml')) {
      await moveToTrash(itemPath)
    }
    else if (entry.isDirectory()) {
      await cleanDirectory(itemPath)
    }
  }

  await cleanPlaceholders(currentDir, entries)
}

/**
 * 解析选项并回收生成资源、空目录和多余占位文件。
 * @param {string[]} args 命令行参数；默认读取进程参数，帮助与非法参数不扫描文件。
 * @returns {Promise<void>} 扫描或回收失败时拒绝，不报告清理成功。
 */
export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      'del-lock': { type: 'boolean' },
      'help': { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    console.log(`用法：pnpm clean [--del-lock]
将 ${[...targets].join('、')} 和 .vitepress/cache 移入回收站。
自底向上回收空目录；只有 .gitkeep 的目录保留，已有其他内容时回收多余的 .gitkeep。
发现隐藏内容时提示；${[...skipDirs].join('、')} 继续跳过，仓库根目录保留。
默认保留 pnpm-lock.yaml；--del-lock 只回收根锁文件，下次安装可能重新解析依赖。
需要已安装的 trash 命令；--help / -h 只显示帮助，不扫描或移动文件。`)
    return
  }

  console.log('开始清理生成资源、空目录和多余的 .gitkeep…')
  await cleanDirectory(rootDir, values['del-lock'])
  console.log('清理完成。')
}

// 导入仅提供 main；直接运行才启动清理流程。
if (import.meta.main) {
  main().catch((error) => {
    console.error(`清理失败：${error.message}\n使用 pnpm clean --help 查看选项；已回收内容可从系统回收站恢复。`)
    process.exitCode = 1
  })
}
