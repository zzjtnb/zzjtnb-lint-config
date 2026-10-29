import assert from 'node:assert/strict'

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

const mocks = {
  spawn: mock.fn(),
  question: mock.fn(),
  close: mock.fn(),
}
mock.module('node:child_process', {
  exports: { spawn: mocks.spawn },
})
mock.module('node:readline/promises', {
  exports: {
    createInterface: () => ({ question: mocks.question, close: mocks.close }),
  },
})

const { choosePublishPackages } = await import('../packages.js')
const { applyVersionPlan, chooseVersionPlan } = await import('../plan.js')
const { publishPackages, releasePack } = await import('../publish.js')
const { unifiedVersionChoices, versionProblem } = await import('../version.js')

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mock.resetCalls()
  mock.method(console, 'log', () => {})
  mock.method(console, 'error', () => {})
  mock.method(console, 'warn', () => {})
  mocks.spawn.mock.mockImplementation(() => {
    const child = new EventEmitter()
    queueMicrotask(() => child.emit('close', 1))
    return child
  })
  answers('r', 'a')
})

afterEach(() => {
  mock.restoreAll()
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
  mocks.spawn.mock.mockImplementation(() => {
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
  mocks.question.mock.mockImplementation(async () => values.shift() ?? 'a')
}

describe('发布范围', () => {
  it('默认首项是全部公开包，不再提供只发两个包的选项', async () => {
    answers('b', 'a')
    assert.deepStrictEqual(await choosePublishPackages(), allPackages.map(item => item.name))
    const [menu] = mocks.question.mock.calls[0].arguments
    assert.ok((menu.split('\n')[1]).includes('发布全部包 [a]'))
    assert.ok(!(menu).includes('[b]'))
  })
})

describe('版本计划', () => {
  it('默认建议基于最高版本统一递增，各包同号', async () => {
    assert.deepStrictEqual(unifiedVersionChoices(allPackages), {
      current: undefined,
      patch: '1.0.5',
      minor: '1.1.0',
      major: '2.0.0',
    })
    answers('p')
    const plan = await chooseVersionPlan(allPackages)
    assert.deepStrictEqual([
      ...plan.values(),
    ], ['1.0.5', '1.0.5', '1.0.5'])
    assert.ok((mocks.question.mock.calls[0].arguments[0]).includes('默认统一版本为 1.0.5'))
  })

  it('上次只写入了部分包时，建议沿用已写入的最高本地版本，不再次递增', () => {
    const state = [
      registryState('@zzjtnb/eslint-config', '1.0.5', '1.0.4'),
      ...allPackages.slice(1),
    ]
    assert.strictEqual(unifiedVersionChoices(state).current, '1.0.5')
  })

  it('拒绝不可发布的统一版本后可改为自定义版本', async () => {
    answers('c', '1.0.4', 'c', '2.3.0')
    const plan = await chooseVersionPlan(allPackages)
    assert.deepStrictEqual([
      ...plan.values(),
    ], ['2.3.0', '2.3.0', '2.3.0'])
  })

  it('可以按各包分别设置版本', async () => {
    answers('i', 'p', 'm', 'c', '1.2.0')
    const plan = await chooseVersionPlan(allPackages)
    assert.deepStrictEqual(Object.fromEntries(plan), {
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
    assert.ok((versionProblem(item, '1.0.6')).includes('已存在'))
    assert.ok((versionProblem(item, '1.0.7')).includes('取消'))
    assert.ok((versionProblem(item, '1.0.3')).includes('必须高于'))
    assert.ok((versionProblem(registryState('@zzjtnb/eslint-config', '0.0.0'), '0.0.0')).includes('占位'))
    assert.strictEqual(versionProblem(item, '1.0.5'), undefined)
  })
})

describe('版本写入的恢复边界', () => {
  const plan = new Map(allPackages.map(item => [item.name, '1.0.5']))

  it('第二个包写入失败时停止，不重复改写已成功的包，也不同步依赖', async () => {
    commandExitCodes([0, 1])
    assert.strictEqual(await applyVersionPlan(allPackages, plan), false)
    assert.equal(mocks.spawn.mock.callCount(), 2)
    assert.strictEqual(mocks.spawn.mock.calls.every(({ arguments: [, args] }) => args.includes('version')), true)
  })

  it('只改写版本不同的包；依赖同步失败只重试 install', async () => {
    answers('r')
    commandExitCodes([0, 0, 1, 0])
    const state = [
      registryState('@zzjtnb/eslint-config', '1.0.5', '1.0.4'),
      ...allPackages.slice(1),
    ]
    assert.strictEqual(await applyVersionPlan(state, plan), true)
    const commands = mocks.spawn.mock.calls.map(({ arguments: [, args] }) => args)
    // 包名保留 -config，版本写入目录使用新的工作区路径。
    assert.match(commands[0][1], /packages[/\\]stylelint$/)
    assert.match(commands[1][1], /packages[/\\]markdownlint$/)
    assert.deepStrictEqual(commands.slice(2), [
      ['install'],
      ['install'],
    ])
  })
})

describe('发布失败后的恢复边界', () => {
  it('命令失败后先重新查 registry，已被接收的版本不重复 publish', async () => {
    let calls = 0
    const fetch = mock.method(globalThis, 'fetch', async () => packageMetadata(calls++ === 0
      ? '1.2.2'
      : '1.2.3'))
    assert.strictEqual(await publishPackages(state), true)
    assert.equal(fetch.mock.callCount(), 2)
    assert.equal(mocks.spawn.mock.callCount(), 1)
  })

  it('目标版本已经存在但 latest 指向其他版本时，也不能复用同一个版本号', async () => {
    mock.method(globalThis, 'fetch', async () => packageMetadata('1.2.2', ['1.2.2', '1.2.3']))
    assert.strictEqual(await publishPackages(state), false)
    assert.equal(mocks.spawn.mock.callCount(), 0)
  })

  it('目标版本曾被取消发布且 latest 较旧时，在 publish 前停止', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({
      'dist-tags': { latest: '1.2.2' },
      'versions': { '1.2.2': {} },
      'time': {
        unpublished: {
          versions: ['1.2.3'],
        },
      },
    }))
    assert.strictEqual(await publishPackages(state), false)
    assert.equal(mocks.spawn.mock.callCount(), 0)
  })
})

describe('原生打包预览入口', () => {
  it('直接调用 pnpm pack --dry-run，不依赖包内转发脚本或发布命令', async () => {
    mocks.spawn.mock.mockImplementation(() => {
      const child = new EventEmitter()
      queueMicrotask(() => child.emit('close', 0))
      return child
    })
    assert.strictEqual(await releasePack(['@zzjtnb/eslint-config']), true)
    const [command, args] = mocks.spawn.mock.calls[0].arguments
    assert.strictEqual(command, 'pnpm')
    assert.strictEqual(args[0], '--dir')
    assert.match(args[1], /packages[/\\]eslint$/)
    assert.deepStrictEqual(args.slice(2), ['pack', '--dry-run'])
  })
})

// 版本确认只读状态，反复选择或中止均不得执行命令。
describe('版本计划确认', () => {
  it('确认、重选、取消与返回版本选择均保留交互结果', async () => {
    const { confirmVersionPlan } = await import('../plan.js')
    answers('p', 'r', 'm', 'y')
    assert.equal((await confirmVersionPlan(allPackages)).get(allPackages[0].name), '1.1.0')
    answers('p', 'a')
    assert.equal(await confirmVersionPlan(allPackages), undefined)
    answers('a')
    assert.equal(await confirmVersionPlan(allPackages), undefined)
    assert.equal(mocks.spawn.mock.callCount(), 0)
  })

  it('独立设置支持保持版本、输入非法值后重试、返回上级及中止', async () => {
    const available = [
      registryState('@zzjtnb/eslint-config', '1.2.4', '1.2.3'),
    ]
    answers('k')
    assert.equal((await chooseVersionPlan(available)).get(available[0].name), '1.2.4')
    answers('i', 'k', 'c', '', 'c', 'invalid', '1.0.0', 'c', '1.0.5', 'p')
    const result = await chooseVersionPlan([
      available[0],
      registryState('@zzjtnb/stylelint-config', '1.0.4', '1.0.4'),
      registryState('@zzjtnb/markdownlint-config', '1.0.4', '1.0.4'),
    ])
    assert.deepEqual([
      ...result.values(),
    ], ['1.2.4', '1.0.5', '1.0.5'])
    answers('i', 'a')
    assert.equal(await chooseVersionPlan(allPackages), undefined)
  })

  it('自定义统一版本返回菜单后仍可选择，并显示新包和跳版本状态', async () => {
    const { confirmVersionPlan } = await import('../plan.js')
    answers('c', '', 'c', '2.0.0', 'y')
    const result = await confirmVersionPlan([
      registryState('@zzjtnb/eslint-config', '1.0.5', '1.0.4'),
      registryState('@zzjtnb/stylelint-config', '1.0.5', undefined),
    ])
    assert.deepEqual([
      ...result.values(),
    ], ['2.0.0', '2.0.0'])
  })
})

describe('单包发布菜单', () => {
  for (const [key, expected] of [
    ['e', '@zzjtnb/eslint-config'],
    ['s', '@zzjtnb/stylelint-config'],
    ['m', '@zzjtnb/markdownlint-config'],
  ]) {
    it(`快捷键 ${key} 只选择 ${expected}`, async () => {
      answers(key)
      assert.deepEqual(await choosePublishPackages(), [expected])
    })
  }
})
