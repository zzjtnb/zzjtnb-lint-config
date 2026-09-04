import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'

/**
 * 将可序列化为 JSON 的数据写入 UTF-8 文件，按需创建父目录并覆盖原文件。
 * @param filePath 相对当前工作目录或绝对的输出文件路径。
 * @param data JSON.stringify 支持的数据；循环引用等序列化错误向调用方传递。
 * @param spaces JSON 缩进空格数，默认 2；实际范围遵循 JSON.stringify。
 * @returns 文件写入完成时结束；序列化或文件系统错误记录后重新抛出。
 */
export async function outputJSON(
  filePath: string,
  data: any,
  spaces: number = 2,
) {
  try {
    const dir = dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    const jsonData = JSON.stringify(data, null, spaces)
    await fs.writeFile(filePath, jsonData, 'utf8')
  }
  catch (error) {
    console.error('Error writing JSON file:', error)
    throw error
  }
}

/**
 * 按需创建文件及其父目录，不截断已有文件内容。
 * @param filePath 相对当前工作目录或绝对的目标文件路径。
 * @returns 文件可用时结束；文件系统错误记录后重新抛出。
 */
export async function ensureFile(filePath: string) {
  try {
    const dir = dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, '', { flag: 'a' })
  }
  catch (error) {
    console.error('Error ensuring file:', error)
    throw error
  }
}

/**
 * 读取 UTF-8 JSON 文件；不支持注释或尾随逗号。
 * @param filePath 相对当前工作目录或绝对的输入文件路径。
 * @returns JSON.parse 的解析结果；读取或语法错误记录后重新抛出。
 */
export async function readJSON(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf8')
    return JSON.parse(data)
  }
  catch (error) {
    console.error('Error reading JSON file:', error)
    throw error
  }
}
