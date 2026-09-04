import { afterEach, describe, expect, it, vi } from 'vitest'

const { readdir, access } = vi.hoisted(() => ({
  readdir: vi.fn(),
  access: vi.fn(),
}))
vi.mock('node:fs/promises', () => ({ readdir, access }))

const { main } = await import('../clean.js')

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('清理命令的无副作用入口', () => {
  it('导入脚本不扫描或清理工作区', () => {
    expect(readdir).not.toHaveBeenCalled()
    expect(access).not.toHaveBeenCalled()
  })

  it.each([
    ['--help'],
    ['-h'],
    ['--del-lock', '--help'],
  ])('帮助不扫描文件或读取锁文件：%j', async (...args) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await main(args)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('用法：pnpm clean'))
    expect(readdir).not.toHaveBeenCalled()
    expect(access).not.toHaveBeenCalled()
  })

  it.each([
    ['--unknown'],
    ['--del-lcok'],
    ['unexpected'],
    ['--del-lock=false'],
  ])('非法参数在任何扫描前失败：%j', async (...args) => {
    await expect(main(args)).rejects.toThrow()
    expect(readdir).not.toHaveBeenCalled()
    expect(access).not.toHaveBeenCalled()
  })
})
