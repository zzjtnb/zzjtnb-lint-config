/** 仅用内存目录和回收命令 mock 验证清理行为，不操作真实工作区。 */
import assert from 'node:assert/strict'
import { basename, dirname, join, resolve } from 'node:path'
import { afterEach, describe, it, mock } from 'node:test'

const readdir = mock.fn()
const execFile = mock.fn()
mock.module('node:fs/promises', {
  exports: { readdir },
})
mock.module('node:child_process', {
  exports: { execFile },
})
const { main } = await import('../index.js')
const root = resolve(import.meta.dirname, '../../..')

afterEach(() => {
  mock.restoreAll()
  readdir.mock.resetCalls()
  execFile.mock.resetCalls()
})

describe('清理命令的无副作用入口', () => {
  it('导入脚本不扫描或清理工作区', () => {
    assert.equal(readdir.mock.callCount(), 0)
    assert.equal(execFile.mock.callCount(), 0)
  })
  for (const args of [
    ['--help'],
    ['-h'],
    ['--del-lock', '--help'],
  ]) {
    it(`帮助不扫描文件或读取锁文件：${JSON.stringify(args)}`, async () => {
      const log = mock.method(console, 'log', () => {})
      await main(args)
      assert.ok(log.mock.calls.some(call => call.arguments[0].includes('用法：pnpm clean')))
      assert.equal(readdir.mock.callCount(), 0)
      assert.equal(execFile.mock.callCount(), 0)
    })
  }
  for (const args of [
    ['--unknown'],
    ['--del-lcok'],
    ['unexpected'],
    ['--del-lock=false'],
  ]) {
    it(`非法参数在任何扫描前失败：${JSON.stringify(args)}`, async () => {
      await assert.rejects(main(args))
      assert.equal(readdir.mock.callCount(), 0)
      assert.equal(execFile.mock.callCount(), 0)
    })
  }
})

/** 名称以 / 结尾表示目录；回收时同步更新父目录，模拟真实扫描结果。 */
function fixture(tree) {
  const directories = new Map(Object.entries(tree).map(([path, names]) => [
    join(root, path),
    names.map(name => ({
      name: name.replace(/\/$/, ''),
      isDirectory: () => name.endsWith('/'),
      isFile: () => !name.endsWith('/'),
    })),
  ]))
  const log = mock.method(console, 'log', () => {})
  readdir.mock.mockImplementation(async (path, options) => {
    const entries = directories.get(path)
    assert.ok(entries, `不应扫描未声明的目录：${path}`)
    return options?.withFileTypes
      ? [...entries]
      : entries.map(entry => entry.name)
  })
  execFile.mock.mockImplementation((command, [path], callback) => {
    assert.equal(command, 'trash')
    directories.set(dirname(path), directories.get(dirname(path)).filter(entry => entry.name !== basename(path)))
    directories.delete(path)
    callback(null, '', '')
  })
  return { directories, log }
}

describe('空目录和占位文件清理', () => {
  it('自底向上回收原有空目录和清理生成物后变空的父目录', async () => {
    fixture({
      '': ['empty/', 'nested/'],
      'empty': [],
      'nested': ['dist/'],
    })
    await main([])
    assert.deepEqual(execFile.mock.calls.map(call => call.arguments[1][0]), [
      join(root, 'empty'),
      join(root, 'nested/dist'),
      join(root, 'nested'),
    ])
  })

  it('空的仓库根目录不会被回收', async () => {
    fixture({ '': [] })
    await main([])
    assert.equal(execFile.mock.callCount(), 0)
  })

  it('提示隐藏内容，保留隐藏文件且不扫描原有跳过目录', async () => {
    const { directories, log } = fixture({
      '': ['.env', '.git/', '.tmp/', '.cache/'],
    })
    await main([])
    assert.deepEqual(directories.get(root).map(entry => entry.name), ['.env', '.git', '.tmp'])
    for (const name of ['.env', '.git', '.tmp', '.cache'])
      assert.ok(log.mock.calls.some(call => call.arguments[0].startsWith('发现隐藏内容') && call.arguments[0].endsWith(join(root, name))))
    assert.equal(readdir.mock.callCount(), 2)
  })

  it('保留纯占位目录，只回收已有其他内容的目录中多余的 .gitkeep', async () => {
    const { directories } = fixture({
      '': ['placeholder/', 'source/', 'generated/'],
      'placeholder': ['.gitkeep'],
      'source': ['.gitkeep', 'index.ts'],
      'generated': ['.gitkeep', 'dist/'],
    })
    await main([])
    assert.deepEqual(directories.get(join(root, 'source')).map(entry => entry.name), ['index.ts'])
    assert.deepEqual(directories.get(join(root, 'placeholder')).map(entry => entry.name), ['.gitkeep'])
    assert.deepEqual(directories.get(join(root, 'generated')).map(entry => entry.name), ['.gitkeep'])
  })

  for (const args of [
    [],
    ['--del-lock'],
  ]) {
    it(`锁文件选项只作用于根目录：${JSON.stringify(args)}`, async () => {
      const { directories } = fixture({
        '': ['pnpm-lock.yaml', 'child/'],
        'child': ['pnpm-lock.yaml'],
      })
      await main(args)
      assert.equal(directories.get(root).some(entry => entry.name === 'pnpm-lock.yaml'), args.length === 0)
      assert.equal(directories.get(join(root, 'child'))[0].name, 'pnpm-lock.yaml')
    })
  }

  it('回收失败直接报错，不继续回收父目录或报告成功', async () => {
    const { log } = fixture({
      '': ['empty/'],
      'empty': [],
    })
    execFile.mock.mockImplementation((_command, _args, callback) => callback(new Error('回收失败')))
    await assert.rejects(main([]), /回收失败/)
    assert.equal(execFile.mock.callCount(), 1)
    assert.ok(log.mock.calls.every(call => call.arguments[0] !== '清理完成。'))
  })
})
