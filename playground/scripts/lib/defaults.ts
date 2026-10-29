/** 元数据与沙箱使用同一份默认配置源码，只执行项目提供的模块，不读取用户草稿。 */
import type { Linter } from 'eslint'
import type { Config } from 'stylelint'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaults } from '../../src/stores/config/catalog'
import { root } from '../utils/index'

interface DefaultConfigs { eslint: Linter.Config[], stylelint: Config }

/** 从临时 ESM 模块加载默认配置，保留正式包名解析和各工具原生返回类型。 */
export async function loadDefaults<T extends keyof DefaultConfigs>(mode: T): Promise<DefaultConfigs[T]> {
  const directory = join(root, '.tmp/playground/defaults')
  await mkdir(directory, { recursive: true })
  const filename = join(directory, `${mode}.mjs`)
  await writeFile(filename, defaults(mode))
  const module: { default: DefaultConfigs[T] | Promise<DefaultConfigs[T]> } = await import(pathToFileURL(filename).href)
  return module.default
}
