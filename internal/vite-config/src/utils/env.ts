import type { ApplicationPluginOptions } from '../typing'

import process from 'node:process'

import { loadEnv } from 'vite'

/**
 * 按 Vite 的模式和目录加载环境变量，并转换应用插件所需的开关及端口。
 * @param mode Vite 配置回调提供的模式；独立调用时默认为 production。
 * @param envDir Vite 环境文件所在目录；false 禁用环境文件，独立调用时默认为当前目录。
 * @returns 原始 VITE_ 变量与应用配置；原始变量和转换结果来自同一次加载。
 * @throws 显式提供的 VITE_PORT 不是 0–65535 范围内的整数时抛出错误。
 */
async function loadAndConvertEnv(
  mode = 'production',
  envDir: string | false = process.cwd(),
): Promise<
  Partial<ApplicationPluginOptions> & {
    appTitle: string
    base: string
    env: Record<string, string>
    port: number
  }
> {
  // 复用 Vite 的文件优先级、变量展开和进程环境覆盖，不从 npm 脚本猜测 mode。
  const env = loadEnv(mode, envDir, 'VITE_')
  const {
    VITE_APP_TITLE,
    VITE_ARCHIVER,
    VITE_BASE,
    VITE_COMPRESS,
    VITE_DEVTOOLS,
    VITE_INJECT_APP_LOADING,
    VITE_NITRO_MOCK,
    VITE_PORT,
    VITE_PWA,
    VITE_VISUALIZER,
  } = env

  // 端口 0 表示由系统分配可用端口，不能通过 || 回退成 5173。
  const port = VITE_PORT === undefined
    ? 5173
    : Number(VITE_PORT)
  if (VITE_PORT?.trim() === '' || !Number.isInteger(port) || port < 0 || port > 65_535)
    throw new Error('VITE_PORT 必须是 0–65535 范围内的整数；未设置时默认使用 5173。')

  const compressTypes = (VITE_COMPRESS ?? '')
    .split(',')
    .filter(item => item === 'brotli' || item === 'gzip')

  return {
    appTitle: VITE_APP_TITLE ?? 'Application',
    archiver: VITE_ARCHIVER === 'true',
    base: VITE_BASE ?? '/',
    compress: compressTypes.length > 0,
    compressTypes,
    devtools: VITE_DEVTOOLS === 'true',
    env,
    injectAppLoading: VITE_INJECT_APP_LOADING === 'true',
    nitroMock: VITE_NITRO_MOCK === 'true',
    port,
    pwa: VITE_PWA === 'true',
    visualizer: VITE_VISUALIZER === 'true',
  }
}

export { loadAndConvertEnv }
