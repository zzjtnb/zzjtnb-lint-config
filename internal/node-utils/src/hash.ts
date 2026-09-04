import { createHash } from 'node:crypto'

/**
 * 生成内容的 MD5 摘要，用于缓存键和产物文件名，不用于密码或安全完整性校验。
 * @param content 按 UTF-8 编码参与计算的原始内容。
 * @param hashLSize 可选的摘要截取长度；未提供或为 0 时返回完整的 32 位十六进制摘要。
 * @returns 完整摘要或其前 hashLSize 个字符。
 */
function generatorContentHash(content: string, hashLSize?: number) {
  const hash = createHash('md5').update(content, 'utf8').digest('hex')

  if (hashLSize) {
    return hash.slice(0, hashLSize)
  }

  return hash
}

export { generatorContentHash }
