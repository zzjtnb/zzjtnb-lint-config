/** 将工作区包清单转换为可供浏览器内包管理器安装的清单。 */
import { readFile } from 'node:fs/promises'
import { findPackageJSON } from 'node:module'
import { pathToFileURL } from 'node:url'

/** 读取公开包清单，按当前实际安装版本展开 catalog 引用，不携带开发脚本与依赖。 */
export async function runtimeManifest(filename: string) {
  const manifest = JSON.parse(await readFile(filename, 'utf8'))
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      if (typeof version !== 'string' || !version.startsWith('catalog:'))
        continue
      const dependency = findPackageJSON(name, pathToFileURL(filename))
      if (!dependency)
        throw new Error(`无法解析 ${manifest.name} 的 ${field}：${name}`)
      manifest[field][name] = JSON.parse(await readFile(dependency, 'utf8')).version
    }
  }
  delete manifest.devDependencies
  delete manifest.scripts
  return manifest
}
