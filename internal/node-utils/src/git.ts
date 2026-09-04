import path from 'node:path'

import { execa } from 'execa'

export * from '@changesets/git'

/**
 * 读取当前 Git 仓库的暂存文件，支持从仓库内任意子目录调用。
 * @returns 去重后的绝对文件路径；成功读取空暂存区时返回空数组。
 * @throws Git 不可用或命令失败时向调用方传递错误，避免误跳过检查。
 */
async function getStagedFiles(): Promise<string[]> {
  const { stdout: root } = await execa('git', ['rev-parse', '--show-toplevel'])
  const { stdout } = await execa('git', [
    '-c',
    'submodule.recurse=false',
    'diff',
    '--staged',
    '--diff-filter=ACMR',
    '--name-only',
    '--ignore-submodules',
    '-z',
  ], { cwd: root })

  // Git 的 NUL 分隔保留空格、换行等合法文件名，路径必须相对仓库根解析。
  return [
    ...new Set(stdout.split('\u0000').filter(Boolean).map(file => path.resolve(root, file))),
  ]
}

export { getStagedFiles }
