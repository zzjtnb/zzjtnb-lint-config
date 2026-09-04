import type { PluginOption } from 'vite'

import { EOL } from 'node:os'
import process from 'node:process'

import { dateUtil, readPackageJSON } from '@zzjtnb/node-utils'

/**
 * 用于注入版权信息
 * @returns Vite 版权信息插件
 */
async function viteLicensePlugin(
  root = process.cwd(),
): Promise<PluginOption | undefined> {
  const {
    description = '',
    homepage = '',
    version = '',
  } = await readPackageJSON(root)

  return {
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      handler(_options, bundle) {
        const date = dateUtil().format('YYYY-MM-DD ')
        const copyrightText = `/*!
  * zzjtnb lint config
  * Version: ${version}
  * Copyright (C) 2026 zzjtnb
  * License: MIT License
  * Description: ${description}
  * Date Created: ${date}
  * Homepage: ${homepage}
*/
              `.trim()

        for (const [, fileContent] of Object.entries(bundle)) {
          if (fileContent.type === 'chunk' && fileContent.isEntry) {
            // 插入版权信息
            const content = fileContent.code
            const updatedContent = `${copyrightText}${EOL}${content}`
            // 更新bundle
            fileContent.code = updatedContent
          }
        }
      },
      order: 'post',
    },
    name: 'vite:license',
  }
}

export { viteLicensePlugin }
