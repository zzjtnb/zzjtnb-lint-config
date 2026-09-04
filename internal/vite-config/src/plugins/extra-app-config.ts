import type { PluginOption, ResolvedConfig } from 'vite'

import {
  generatorContentHash,
  readPackageJSON,
} from '@zzjtnb/node-utils'

import { loadEnv } from 'vite'

interface PluginOptions {
  // 是否为生产构建；开发服务不生成运行时配置资产。
  isBuild: boolean
}

const GLOBAL_CONFIG_FILE_NAME = '_app-config'
const ZZJTNB_LINT_CONFIG_APP_CONF = '_ZZJTNB_LINT_CONFIG_APP_CONF_'

/**
 * 生成独立的只读运行时配置资产，并将同一资产地址注入 HTML。
 * @param options 是否为构建模式；环境目录、模式和 base 取宿主 Vite 的最终配置。
 * @returns 构建专属插件；开发模式返回 undefined，配置读取或资产写入错误向构建传递。
 */

async function viteExtraAppConfigPlugin({
  isBuild,
}: PluginOptions): Promise<PluginOption | undefined> {
  let publicPath: string
  let source: string
  let hash: string
  let version: string

  if (!isBuild) {
    return
  }

  return {
    async configResolved(config) {
      version = (await readPackageJSON(config.root)).version ?? ''
      publicPath = ensureTrailingSlash(config.base)
      source = getConfigSource(config)
      hash = generatorContentHash(source, 8)
    },
    generateBundle() {
      // 产物缺失会让 HTML 引用失效，必须由构建调用方接收 emitFile 的错误。
      this.emitFile({
        fileName: `${GLOBAL_CONFIG_FILE_NAME}-${version}-${hash}.js`,
        source,
        type: 'asset',
      })
    },
    name: 'vite:extra-app-config',
    async transformIndexHtml(html) {
      const appConfigSrc = `${publicPath}${GLOBAL_CONFIG_FILE_NAME}-${version}-${hash}.js`

      return {
        html,
        tags: [
          {
            attrs: { src: appConfigSrc },
            tag: 'script',
          },
        ],
      }
    },
  }
}

function getConfigSource({ mode, envDir }: ResolvedConfig) {
  // 与宿主 Vite 使用同一模式及目录，仅公开 VITE_GLOB_ 前缀的运行时配置。
  const config = loadEnv(mode, envDir, 'VITE_GLOB_')
  const windowVariable = `window.${ZZJTNB_LINT_CONFIG_APP_CONF}`
  // 确保变量不会被修改
  let source = `${windowVariable}=${JSON.stringify(config)};`
  source += `
    Object.freeze(${windowVariable});
    Object.defineProperty(window, "${ZZJTNB_LINT_CONFIG_APP_CONF}", {
      configurable: false,
      writable: false,
    });
  `.replaceAll(/\s/g, '')
  return source
}

function ensureTrailingSlash(path: string) {
  return path.endsWith('/')
    ? path
    : `${path}/`
}

export { viteExtraAppConfigPlugin }
