import process from 'node:process'

import { stylelintDefaultIgnoreGlobs } from './constants.js'

interface StylelintIgnoreOptions {
  cwd?: string
  globs?: string[]
}

/**
 * 将消费方项目根目录和默认 glob 合成为 Stylelint 可直接使用的忽略路径。
 *
 * 共享包不能把 `ignoreFiles` 写成相对路径，否则 Stylelint 可能以共享包自身目录
 * 或 `configBasedir` 解析，最终错误地扫描消费方的 `node_modules`。使用调用方 CWD
 * 可以让同一份配置在 monorepo、单包和 CI 中保持一致。
 *
 * @param {{ cwd?: string, globs?: string[] }} [options]
 */
export function createStylelintIgnoreFiles({
  cwd = process.cwd(),
  globs = stylelintDefaultIgnoreGlobs,
}: StylelintIgnoreOptions = {}): string[] {
  const normalizedCwd = cwd.replace(/\\/g, '/')
  return globs.map(glob => `${normalizedCwd}/${glob}`)
}

/** 基于调用时工作目录生成的默认忽略列表。 */
export const stylelintIgnoreFiles = createStylelintIgnoreFiles()
