import { describe, expect, it } from 'vitest'

import { toPosixPath } from '../src/path'

describe('toPosixPath', () => {
  // 测试 Windows 风格路径到 POSIX 风格路径的转换
  it('将 Windows 路径转换为 POSIX 路径', () => {
    const windowsPath = String.raw`C:\Users\Example\file.txt`
    const expectedPosixPath = 'C:/Users/Example/file.txt'
    expect(toPosixPath(windowsPath)).toBe(expectedPosixPath)
  })

  // 确认 POSIX 风格路径不会被改变
  it('保留已有 POSIX 路径', () => {
    const posixPath = '/home/user/file.txt'
    expect(toPosixPath(posixPath)).toBe(posixPath)
  })

  // 测试带有多个分隔符的路径
  it('转换混合分隔符路径', () => {
    const mixedPath = String.raw`C:/Users\Example\file.txt`
    const expectedPosixPath = 'C:/Users/Example/file.txt'
    expect(toPosixPath(mixedPath)).toBe(expectedPosixPath)
  })

  // 测试空字符串
  it('保留空字符串', () => {
    const emptyPath = ''
    expect(toPosixPath(emptyPath)).toBe('')
  })

  // 测试仅包含分隔符的路径
  it('转换仅含分隔符的路径', () => {
    const separatorsPath = '\\\\\\'
    const expectedPosixPath = '///'
    expect(toPosixPath(separatorsPath)).toBe(expectedPosixPath)
  })

  // 测试不包含任何分隔符的路径
  it('保留不含分隔符的路径', () => {
    const noSeparatorPath = 'file.txt'
    expect(toPosixPath(noSeparatorPath)).toBe('file.txt')
  })

  // 测试以分隔符结尾的路径
  it('保留路径末尾的分隔符', () => {
    const endingSeparatorPath = 'C:\\Users\\Example\\'
    const expectedPosixPath = 'C:/Users/Example/'
    expect(toPosixPath(endingSeparatorPath)).toBe(expectedPosixPath)
  })

  // 测试以分隔符开头的路径
  it('保留路径开头的分隔符', () => {
    const startingSeparatorPath = String.raw`\Users\Example`
    const expectedPosixPath = '/Users/Example'
    expect(toPosixPath(startingSeparatorPath)).toBe(expectedPosixPath)
  })

  // 测试包含非法字符的路径
  it('转换分隔符时不改写其他字符', () => {
    const invalidCharsPath = String.raw`C:\Us*?ers\Ex<ample>|file.txt`
    const expectedPosixPath = 'C:/Us*?ers/Ex<ample>|file.txt'
    expect(toPosixPath(invalidCharsPath)).toBe(expectedPosixPath)
  })
})
