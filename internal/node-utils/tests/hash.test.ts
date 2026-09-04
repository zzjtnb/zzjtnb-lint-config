import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { generatorContentHash } from '../src/hash'

describe('generatorContentHash', () => {
  it('为内容生成 MD5 哈希', () => {
    const content = 'example content'
    const expectedHash = createHash('md5')
      .update(content, 'utf8')
      .digest('hex')
    const actualHash = generatorContentHash(content)
    expect(actualHash).toBe(expectedHash)
  })

  it('按指定长度截取 MD5 哈希', () => {
    const content = 'example content'
    const hashLength = 10
    const generatedHash = generatorContentHash(content, hashLength)
    expect(generatedHash).toHaveLength(hashLength)
  })

  it('截取结果与完整哈希的前缀一致', () => {
    const content = 'example content'
    const hashLength = 8
    const expectedHash = createHash('md5')
      .update(content, 'utf8')
      .digest('hex')
      .slice(0, hashLength)
    const generatedHash = generatorContentHash(content, hashLength)
    expect(generatedHash).toBe(expectedHash)
  })

  it('未指定长度时返回完整哈希', () => {
    const content = 'example content'
    const expectedHash = createHash('md5')
      .update(content, 'utf8')
      .digest('hex')
    const actualHash = generatorContentHash(content)
    expect(actualHash).toBe(expectedHash)
  })

  it('为空内容生成确定的哈希', () => {
    const content = ''
    const expectedHash = createHash('md5')
      .update(content, 'utf8')
      .digest('hex')
    const actualHash = generatorContentHash(content)
    expect(actualHash).toBe(expectedHash)
  })
})
