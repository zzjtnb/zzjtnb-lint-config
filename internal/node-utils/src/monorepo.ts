import type { Package } from '@manypkg/get-packages'

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

import * as manypkg from '@manypkg/get-packages'

const { getPackages: getPackagesFunc, getPackagesSync: getPackagesSyncFunc }
  = manypkg

/**
 * 向上查找包含 pnpm-lock.yaml 的目录，不修改调用方工作目录。
 * @param cwd 查找起点，默认使用当前工作目录；相对路径先解析为绝对路径。
 * @returns 首个匹配的绝对目录；未找到时返回空字符串。
 */
function findMonorepoRoot(cwd: string = process.cwd()) {
  let currentDir = resolve(cwd)

  while (true) {
    if (existsSync(join(currentDir, 'pnpm-lock.yaml'))) {
      return currentDir
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      return ''
    }

    currentDir = parentDir
  }
}

/**
 * 从当前工作目录定位工作区，并同步读取包元数据。
 * @returns manypkg 解析的工作区根包、包列表和包管理器信息；定位或解析失败时抛出错误。
 */
function getPackagesSync() {
  const root = findMonorepoRoot()
  return getPackagesSyncFunc(root)
}

/**
 * 从当前工作目录定位工作区，并异步读取包元数据。
 * @returns manypkg 解析的工作区根包、包列表和包管理器信息；定位或解析失败时拒绝。
 */
async function getPackages() {
  const root = findMonorepoRoot()

  return await getPackagesFunc(root)
}

/**
 * 按 package.json 的完整包名查找当前工作区中的成员包。
 * @param pkgName 包的完整名称，包含适用的 scope。
 * @returns 匹配的包元数据；不存在时返回 undefined，工作区解析错误向调用方传递。
 */
async function getPackage(pkgName: string) {
  const { packages } = await getPackages()
  return packages.find((pkg: Package) => pkg.packageJson.name === pkgName)
}

export { findMonorepoRoot, getPackage, getPackages, getPackagesSync }
