import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chooseMenu } from './prompt.js'

// 仓库根目录；按本文件位置定位，不依赖调用时的工作目录。
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// 公开包名到 packages/ 下目录名的映射，顺序即默认检查和发布顺序。
const PACKAGE_DIRECTORIES = {
  '@zzjtnb/eslint-config': 'eslint',
  '@zzjtnb/stylelint-config': 'stylelint',
  '@zzjtnb/markdownlint-config': 'markdownlint',
}
const PACKAGES = Object.keys(PACKAGE_DIRECTORIES)

/**
 * 返回公开包所在目录的绝对路径。
 * @param {string} packageName 公开包名。
 * @returns {string} 包目录绝对路径。
 * @throws {Error} 包名不在发布范围内时抛出。
 */
function packageDirectory(packageName) {
  const directory = PACKAGE_DIRECTORIES[packageName]
  if (!directory)
    throw new Error(`未知的发布包：${packageName}`)
  return resolve(ROOT, 'packages', directory)
}

/**
 * 读取公开包当前写在 package.json 中的版本；每次调用都重新读取文件。
 * @param {string} packageName 公开包名。
 * @returns {string} package.json 的 version 字段。
 */
function packageVersion(packageName) {
  return JSON.parse(readFileSync(resolve(packageDirectory(packageName), 'package.json'), 'utf8')).version
}

/**
 * 根据所选公开包的实际产物生成发布前检查，不执行命令。
 * @param {string[]} packageNames 本次选中的公开包名称。
 * @returns {Array<[string, string[]]>} 按执行顺序排列的检查说明与 pnpm 参数。
 */
function packageCheckSteps(packageNames) {
  return [
    ...packageNames.flatMap((packageName) => {
      const directory = packageDirectory(packageName)
      // 每个所选包分别验证构建入口与公开类型。
      return [
        [
          `${packageName} 构建`,
          ['--dir', directory, 'run', 'build'],
        ],
        [
          `${packageName} 类型检查`,
          ['--dir', directory, 'run', 'typecheck'],
        ],
        [
          `${packageName} 测试`,
          // 单次运行包自身的源码与公开入口测试，禁止进入监听后停在发布前。
          [
            '--dir',
            directory,
            'run',
            'test',
            '--run',
          ],
        ],
      ]
    }),
    // 根入口统一维护三个工具、配置与缓存；整仓检查只执行一次。
    [
      '仓库检查',
      ['--dir', ROOT, 'run', 'lint'],
    ],
  ]
}

/**
 * 选择本次发布范围；默认第一项发布全部公开包，也可只发布单个包。
 * @returns {Promise<string[]>} 按发布顺序排列的公开包名。
 */
async function choosePublishPackages() {
  const selection = await chooseMenu('请选择本次发布范围', [
    { description: '默认检查并发布 ESLint、Stylelint 和 Markdownlint 三个包', key: 'a', label: '发布全部包' },
    { description: '只检查并发布 @zzjtnb/eslint-config', key: 'e', label: '仅发布 ESLint' },
    { description: '只检查并发布 @zzjtnb/stylelint-config', key: 's', label: '仅发布 Stylelint' },
    { description: '只检查并发布 @zzjtnb/markdownlint-config', key: 'm', label: '仅发布 Markdownlint' },
  ])
  if (selection === 'e')
    return ['@zzjtnb/eslint-config']
  if (selection === 's')
    return ['@zzjtnb/stylelint-config']
  if (selection === 'm')
    return ['@zzjtnb/markdownlint-config']
  return PACKAGES
}

export { choosePublishPackages, packageCheckSteps, packageDirectory, packageVersion, ROOT }
