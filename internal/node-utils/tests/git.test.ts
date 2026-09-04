import path from 'node:path'
import process from 'node:process'

import { execa } from 'execa'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStagedFiles } from '../src/git'

vi.mock('execa', () => ({
  execa: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(execa).mockReset()
})

describe('暂存文件读取', () => {
  it('在子目录调用时仍按 Git 仓库根解析全部暂存路径', async () => {
    const root = path.resolve('/example/repository')
    vi.spyOn(process, 'cwd').mockReturnValue(path.join(root, 'apps/demo'))
    vi.mocked(execa)
      .mockResolvedValueOnce({ stdout: root } as never)
      .mockResolvedValueOnce({ stdout: 'packages/config.ts\0file with space.ts\0line\nbreak.ts\0' } as never)

    await expect(getStagedFiles()).resolves.toEqual([
      path.join(root, 'packages/config.ts'),
      path.join(root, 'file with space.ts'),
      path.join(root, 'line\nbreak.ts'),
    ])
    expect(execa).toHaveBeenLastCalledWith('git', expect.arrayContaining(['--name-only', '-z']), { cwd: root })
  })

  it('git 失败时拒绝操作，不伪装成没有暂存文件', async () => {
    const error = new Error('Git unavailable')
    vi.mocked(execa).mockRejectedValueOnce(error)
    await expect(getStagedFiles()).rejects.toBe(error)
  })

  it('成功读取空暂存区时返回空数组', async () => {
    vi.mocked(execa)
      .mockResolvedValueOnce({
        stdout: process.cwd(),
      } as never)
      .mockResolvedValueOnce({ stdout: '' } as never)
    await expect(getStagedFiles()).resolves.toEqual([])
  })
})
