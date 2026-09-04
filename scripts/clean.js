import { execFile } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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

async function moveToTrash(itemPath) {
  await execFileAsync('trash', [itemPath])
  console.log(`已移入回收站：${itemPath}`)
}

async function cleanDirectory(currentDir, depth = 0) {
  if (depth > 10)
    return

  let entries
  try {
    entries = await readdir(currentDir, { withFileTypes: true })
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error
    return
  }

  for (const entry of entries) {
    if (skipDirs.has(entry.name))
      continue

    const itemPath = join(currentDir, entry.name)
    const isVitePressCache = entry.name === 'cache' && currentDir.endsWith('.vitepress')
    if (targets.has(entry.name) || isVitePressCache) {
      await moveToTrash(itemPath)
      continue
    }

    if (entry.isDirectory())
      await cleanDirectory(itemPath, depth + 1)
  }
}

/**
 * 解析清理选项后，将已声明的生成目录移入系统回收站。
 * @param {string[]} args 命令行参数；帮助或非法参数不得启动文件扫描。
 * @returns {Promise<void>} 清理完成时结束；扫描或回收失败向调用方抛出错误。
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
    console.log('用法：pnpm clean [--del-lock]\n将 node_modules、dist、dist.zip、coverage、.cache、.turbo 和 VitePress cache 移入回收站。\n默认保留 pnpm-lock.yaml；--del-lock 同时回收锁文件，下次安装可能重新解析依赖。\n需要已安装的 trash 命令；--help / -h 只显示帮助，不扫描或移动文件。')
    return
  }
  const deleteLock = values['del-lock']
  const targetNames = [
    ...targets,
    ...(deleteLock
      ? ['pnpm-lock.yaml']
      : []),
  ]

  console.log(`开始清理：${targetNames.join('、')}`)
  await cleanDirectory(rootDir)

  if (deleteLock) {
    const lockPath = join(rootDir, 'pnpm-lock.yaml')
    try {
      await access(lockPath)
      await moveToTrash(lockPath)
    }
    catch (error) {
      if (error.code !== 'ENOENT')
        throw error
    }
  }

  console.log('清理完成。')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`清理失败：${error.message}\n使用 pnpm clean --help 查看选项；已回收内容可从系统回收站恢复。`)
    process.exitCode = 1
  })
}
