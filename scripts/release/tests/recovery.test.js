import { EventEmitter } from 'node:events'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
  question: vi.fn(),
  close: vi.fn(),
}))
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }))
vi.mock('node:readline/promises', () => ({
  createInterface: () => ({ question: mocks.question, close: mocks.close }),
}))

const { choosePublishPackages } = await import('../packages.js')
const { applyVersionPlan, chooseVersionPlan } = await import('../plan.js')
const { publishPackages } = await import('../publish.js')
const { unifiedVersionChoices, versionProblem } = await import('../version.js')

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  mocks.spawn.mockImplementation(() => {
    const child = new EventEmitter()
    queueMicrotask(() => child.emit('close', 1))
    return child
  })
  mocks.question.mockResolvedValueOnce('r').mockResolvedValue('a')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const state = [
  { name: '@zzjtnb/eslint-config', local: '1.2.3' },
]

function packageMetadata(latest, versions = [latest]) {
  return Response.json({
    'dist-tags': { latest },
    'versions': Object.fromEntries(versions.map(version => [
      version,
      { version },
    ])),
  })
}

function commandExitCodes(codes) {
  mocks.spawn.mockImplementation(() => {
    const child = new EventEmitter()
    const code = codes.shift() ?? 1
    queueMicrotask(() => child.emit('close', code))
    return child
  })
}

function registryState(name, local, remote, versions = remote
  ? [remote]
  : []) {
  return {
    name,
    local,
    remote,
    publishedVersions: versions,
    unpublishedVersions: [],
  }
}

const allPackages = [
  registryState('@zzjtnb/eslint-config', '1.0.4', '1.0.4'),
  registryState('@zzjtnb/stylelint-config', '1.0.4', '1.0.4'),
  registryState('@zzjtnb/markdownlint-config', '1.0.0', '1.0.0'),
]

function answers(...values) {
  mocks.question.mockReset()
  for (const value of values)
    mocks.question.mockResolvedValueOnce(value)
  // 用尽预设答案后中止，避免测试因菜单循环而挂起。
  mocks.question.mockResolvedValue('a')
}

describe('发布范围', () => {
  it('默认首项是全部公开包，不再提供只发两个包的选项', async () => {
    answers('b', 'a')
    expect(await choosePublishPackages()).toEqual(allPackages.map(item => item.name))
    const [menu] = mocks.question.mock.calls[0]
    expect(menu.split('\n')[1]).toContain('发布全部包 [a]')
    expect(menu).not.toContain('[b]')
  })
})

describe('版本计划', () => {
  it('默认建议基于最高版本统一递增，各包同号', async () => {
    expect(unifiedVersionChoices(allPackages)).toEqual({
      current: undefined,
      patch: '1.0.5',
      minor: '1.1.0',
      major: '2.0.0',
    })
    answers('p')
    const plan = await chooseVersionPlan(allPackages)
    expect([
      ...plan.values(),
    ]).toEqual(['1.0.5', '1.0.5', '1.0.5'])
    expect(mocks.question.mock.calls[0][0]).toContain('默认统一版本为 1.0.5')
  })

  it('上次只写入了部分包时，建议沿用已写入的最高本地版本，不再次递增', () => {
    const state = [
      registryState('@zzjtnb/eslint-config', '1.0.5', '1.0.4'),
      ...allPackages.slice(1),
    ]
    expect(unifiedVersionChoices(state).current).toBe('1.0.5')
  })

  it('拒绝不可发布的统一版本后可改为自定义版本', async () => {
    answers('c', '1.0.4', 'c', '2.3.0')
    const plan = await chooseVersionPlan(allPackages)
    expect([
      ...plan.values(),
    ]).toEqual(['2.3.0', '2.3.0', '2.3.0'])
  })

  it('可以按各包分别设置版本', async () => {
    answers('i', 'p', 'm', 'c', '1.2.0')
    const plan = await chooseVersionPlan(allPackages)
    expect(Object.fromEntries(plan)).toEqual({
      '@zzjtnb/eslint-config': '1.0.5',
      '@zzjtnb/stylelint-config': '1.1.0',
      '@zzjtnb/markdownlint-config': '1.2.0',
    })
  })

  it('已发布、曾取消发布、不高于 latest 和初始占位版本都不能使用', () => {
    const item = {
      ...registryState('@zzjtnb/eslint-config', '1.0.4', '1.0.4', ['1.0.4', '1.0.6']),
      unpublishedVersions: ['1.0.7'],
    }
    expect(versionProblem(item, '1.0.6')).toContain('已存在')
    expect(versionProblem(item, '1.0.7')).toContain('取消')
    expect(versionProblem(item, '1.0.3')).toContain('必须高于')
    expect(versionProblem(registryState('@zzjtnb/eslint-config', '0.0.0'), '0.0.0')).toContain('占位')
    expect(versionProblem(item, '1.0.5')).toBeUndefined()
  })
})

describe('版本写入的恢复边界', () => {
  const plan = new Map(allPackages.map(item => [item.name, '1.0.5']))

  it('第二个包写入失败时停止，不重复改写已成功的包，也不同步依赖', async () => {
    commandExitCodes([0, 1])
    expect(await applyVersionPlan(allPackages, plan)).toBe(false)
    expect(mocks.spawn).toHaveBeenCalledTimes(2)
    expect(mocks.spawn.mock.calls.every(([, args]) => args.includes('version'))).toBe(true)
  })

  it('只改写版本不同的包；依赖同步失败只重试 install', async () => {
    answers('r')
    commandExitCodes([0, 0, 1, 0])
    const state = [
      registryState('@zzjtnb/eslint-config', '1.0.5', '1.0.4'),
      ...allPackages.slice(1),
    ]
    expect(await applyVersionPlan(state, plan)).toBe(true)
    const commands = mocks.spawn.mock.calls.map(([, args]) => args)
    expect(commands.slice(0, 2).map(args => args[1])).toEqual(state.slice(1).map(item => expect.stringContaining(item.name.split('/')[1])))
    expect(commands.slice(2)).toEqual([
      ['install'],
      ['install'],
    ])
  })
})

describe('发布失败后的恢复边界', () => {
  it('命令失败后先重新查 registry，已被接收的版本不重复 publish', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(packageMetadata('1.2.2'))
      .mockResolvedValue(packageMetadata('1.2.3'))
    vi.stubGlobal('fetch', fetch)
    expect(await publishPackages(state)).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(mocks.spawn).toHaveBeenCalledOnce()
  })

  it('目标版本已经存在但 latest 指向其他版本时，也不能复用同一个版本号', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(packageMetadata('1.2.2', ['1.2.2', '1.2.3'])))
    expect(await publishPackages(state)).toBe(false)
    expect(mocks.spawn).not.toHaveBeenCalled()
  })

  it('目标版本曾被取消发布且 latest 较旧时，在 publish 前停止', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      'dist-tags': { latest: '1.2.2' },
      'versions': { '1.2.2': {} },
      'time': {
        unpublished: {
          versions: ['1.2.3'],
        },
      },
    })))
    expect(await publishPackages(state)).toBe(false)
    expect(mocks.spawn).not.toHaveBeenCalled()
  })
})
