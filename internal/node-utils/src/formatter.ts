import fs from 'node:fs/promises'

import { execa } from 'execa'

/**
 * 使用当前命令环境中的 oxfmt 格式化单个文件，并读取格式化后的文本。
 * @param filepath 相对当前工作目录或绝对的目标文件路径，执行时会原地写入文件。
 * @returns 格式化后按 UTF-8 读取的文件内容；命令或读取失败时向调用方抛出错误。
 */
async function formatFile(filepath: string) {
  await execa('oxfmt', ['--', filepath], {
    stdio: 'inherit',
  })

  return await fs.readFile(filepath, 'utf8')
}

export { formatFile }
