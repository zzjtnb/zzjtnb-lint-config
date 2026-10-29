import { readFileSync } from 'node:fs'
import { findPackageJSON } from 'node:module'
import { dirname, resolve } from 'node:path'
/**
 * 按已安装包正式声明的 bin 定位测试子进程入口，避免依赖第三方包内部布局。
 * 测试直接启动该 JavaScript 入口，以隔离包管理器的安装钩子并兼容不同平台。
 * @param {string} packageName 根测试环境中已安装的工具包名。
 * @param {string} command 包声明的可执行命令名，默认与包名相同。
 * @param {string | URL} parentURL 定位工具的所属工作区入口。
 * @returns {string} 可传给 Node.js 子进程的绝对入口路径。
 * @throws 包或指定命令未声明时明确失败，不猜测内部文件位置。
 */
export function cliPath(packageName, command = packageName, parentURL = import.meta.url) {
  const manifestPath = findPackageJSON(packageName, parentURL)
  if (!manifestPath)
    throw new Error(`未找到工具包：${packageName}`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const entry = typeof manifest.bin === 'string'
    ? manifest.bin
    : manifest.bin?.[command]
  if (typeof entry !== 'string')
    throw new TypeError(`${packageName} 未声明命令：${command}`)
  return resolve(dirname(manifestPath), entry)
}
