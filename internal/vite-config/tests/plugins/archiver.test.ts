import type { Plugin, ResolvedConfig } from 'vite'

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { resolve } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  stat: vi.fn(),
  createWriteStream: vi.fn(),
  archive: vi.fn(),
}))

vi.mock('node:fs', () => ({
  default: { createWriteStream: mocks.createWriteStream },
}))
vi.mock('node:fs/promises', () => ({
  default: { mkdir: mocks.mkdir, stat: mocks.stat },
}))
vi.mock('archiver', () => ({
  ZipArchive: class {
    constructor(...args: unknown[]) {
      return mocks.archive(...args)
    }
  },
}))

const { viteArchiverPlugin } = await import('../../src/plugins/archiver')
type WriteBundleHandler = Extract<Plugin['writeBundle'], { handler: unknown }>['handler']
const outputOptions = {} as Parameters<WriteBundleHandler>[0]

let output: EventEmitter & { destroy: ReturnType<typeof vi.fn> }
let archive: EventEmitter & {
  pipe: ReturnType<typeof vi.fn>
  directory: ReturnType<typeof vi.fn>
  finalize: ReturnType<typeof vi.fn>
  abort: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.mkdir.mockResolvedValue(undefined)
  mocks.stat.mockResolvedValue({
    isDirectory: () => true,
  })
  output = Object.assign(new EventEmitter(), {
    destroy: vi.fn(),
  })
  archive = Object.assign(new EventEmitter(), {
    pipe: vi.fn(),
    directory: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn(),
  })
  mocks.createWriteStream.mockReturnValue(output)
  mocks.archive.mockReturnValue(archive)
})

async function configure(options = {}) {
  const plugin = viteArchiverPlugin(options) as Plugin
  assert.ok(typeof plugin.configResolved === 'function')
  await plugin.configResolved.call({} as never, {
    root: '/workspace/app',
    build: { outDir: 'public-build' },
  } as ResolvedConfig)
  const hook = plugin.writeBundle
  assert.ok(hook && typeof hook === 'object' && typeof hook.handler === 'function')
  return hook.handler
}

describe('归档插件的写入生命周期', () => {
  it('使用实际输出目录，并等待文件关闭后才报告完成', async () => {
    const writeBundle = await configure({ name: 'site', outputDir: 'artifacts' })
    let finished = false
    const pending = Promise.resolve(writeBundle.call({} as never, { ...outputOptions, dir: '/workspace/app/custom-output' }, {})).then(() => {
      finished = true
    })
    await vi.waitFor(() => expect(archive.directory).toHaveBeenCalledWith('/workspace/app/custom-output', false))
    expect(mocks.createWriteStream).toHaveBeenCalledWith(resolve('/workspace/app/artifacts/site.zip'))
    expect(finished).toBe(false)
    output.emit('close')
    await pending
    expect(finished).toBe(true)
  })

  it('输出目录创建失败时拒绝钩子，而不是记录错误后成功退出', async () => {
    const writeBundle = await configure()
    mocks.mkdir.mockRejectedValue(new Error('不能创建输出目录'))
    await expect(writeBundle.call({} as never, outputOptions, {})).rejects.toThrow('不能创建输出目录')
    expect(mocks.createWriteStream).not.toHaveBeenCalled()
  })

  it.each([
    'output',
    'archive',
    'warning',
    'finalize',
  ])('传播 %s 失败并释放本次流', async (failure) => {
    const writeBundle = await configure()
    const error = new Error('归档写入失败')
    if (failure === 'finalize')
      archive.finalize.mockRejectedValue(error)
    const pending = writeBundle.call({} as never, outputOptions, {})
    const rejected = expect(pending).rejects.toThrow('归档写入失败')
    await vi.waitFor(() => expect(archive.finalize).toHaveBeenCalled())
    if (failure === 'output')
      output.emit('error', error)
    if (failure === 'archive' || failure === 'warning')
      archive.emit(failure === 'archive'
        ? 'error'
        : 'warning', error)
    await rejected
    expect(archive.abort).toHaveBeenCalledOnce()
    expect(output.destroy).toHaveBeenCalledOnce()
  })

  it('拒绝把 ZIP 写入被归档目录，避免把正在写入的文件再次归档', async () => {
    const writeBundle = await configure({ outputDir: 'public-build' })
    await expect(writeBundle.call({} as never, outputOptions, {})).rejects.toThrow('归档输出不能位于构建产物目录内')
    expect(mocks.createWriteStream).not.toHaveBeenCalled()
  })
})
