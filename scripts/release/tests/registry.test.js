/** 发布前登录与远程版本状态的成功、重试和中止行为。 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, it, mock } from 'node:test'

const capture = mock.fn()
const run = mock.fn()
const chooseMenu = mock.fn()
const chooseRetryOrAbort = mock.fn()
mock.module('../command.js', {
  exports: { capture, run },
})
mock.module('../prompt.js', {
  exports: {
    chooseMenu,
    chooseRetryOrAbort,
    handOverTerminal: task => task(),
  },
})
const { ensureLogin, npmPackageState, readReleaseState } = await import('../registry.js')

beforeEach(() => {
  for (const fn of [
    capture,
    run,
    chooseMenu,
    chooseRetryOrAbort,
  ]) fn.mock.resetCalls()
  mock.method(console, 'log', () => {})
  mock.method(console, 'error', () => {})
})
afterEach(() => mock.restoreAll())

it('已登录直接返回，未登录可中止而不启动登录命令', async () => {
  capture.mock.mockImplementation(async () => ({ code: 0, stdout: ' maintainer\n' }))
  assert.equal(await ensureLogin(), true)
  capture.mock.mockImplementation(async () => ({ code: 1, stdout: '' }))
  chooseMenu.mock.mockImplementation(async () => 'a')
  assert.equal(await ensureLogin(), false)
  assert.equal(run.mock.callCount(), 0)
})

it('先重试登录状态，登录命令失败后可以再次登录，成功后重新核验身份', async () => {
  let checks = 0
  capture.mock.mockImplementation(async () => ({
    code: ++checks < 4
      ? 1
      : 0,
    stdout: 'maintainer',
  }))
  const actions = ['r', 'l', 'l']
  chooseMenu.mock.mockImplementation(async () => actions.shift())
  const codes = [1, 0]
  run.mock.mockImplementation(async () => codes.shift())
  assert.equal(await ensureLogin(), true)
  assert.equal(capture.mock.callCount(), 4)
  assert.equal(run.mock.callCount(), 2)
  assert.deepEqual(run.mock.calls[0].arguments, [
    'pnpm',
    ['login', '--registry', 'https://registry.npmjs.org/'],
  ])
})

it('404 代表未找到，其他 HTTP 失败和网络错误必须暴露', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }))
  assert.deepEqual(await npmPackageState('@zzjtnb/eslint-config'), {
    notFound: true,
    remote: undefined,
    publishedVersions: [],
    unpublishedVersions: [],
  })
  globalThis.fetch.mock.mockImplementation(async () => new Response('', { status: 503 }))
  await assert.rejects(npmPackageState('@zzjtnb/eslint-config'), /HTTP 503/)
  globalThis.fetch.mock.mockImplementation(async () => {
    throw new Error('offline')
  })
  await assert.rejects(npmPackageState('@zzjtnb/eslint-config'), /offline/)
})

it('保留所有版本、latest 和已取消发布版本；缺少可选元数据时返回空列表', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({
    'dist-tags': { latest: '1.0.4' },
    'versions': { '1.0.4': {}, '1.0.5': {} },
    'time': {
      unpublished: {
        versions: ['1.0.3'],
      },
    },
  }))
  assert.deepEqual(await npmPackageState('@zzjtnb/eslint-config'), {
    notFound: false,
    remote: '1.0.4',
    publishedVersions: ['1.0.4', '1.0.5'],
    unpublishedVersions: ['1.0.3'],
  })
  globalThis.fetch.mock.mockImplementation(async () => Response.json({}))
  assert.deepEqual(await npmPackageState('@zzjtnb/eslint-config'), {
    notFound: false,
    remote: undefined,
    publishedVersions: [],
    unpublishedVersions: [],
  })
})

it('读取版本失败可重试；保留本地版本并报告未找到、未发布和已删除状态', async () => {
  let count = 0
  const responses = [
    new Response('', { status: 404 }),
    Response.json({}),
    Response.json({
      time: {
        unpublished: {
          versions: ['1.0.5'],
        },
      },
    }),
  ]
  mock.method(globalThis, 'fetch', async () => {
    if (count++ === 0)
      throw new Error('offline')
    return responses.shift()
  })
  chooseRetryOrAbort.mock.mockImplementation(async () => 'r')
  const names = ['@zzjtnb/eslint-config', '@zzjtnb/stylelint-config', '@zzjtnb/markdownlint-config']
  const result = await readReleaseState(names)
  assert.deepEqual(result.map(item => item.name), names)
  assert.equal(result[0].notFound, true)
  assert.deepEqual(result[2].unpublishedVersions, ['1.0.5'])
  assert.equal(chooseRetryOrAbort.mock.callCount(), 1)
})

it('查询中止不返回部分成功的版本列表', async () => {
  mock.method(globalThis, 'fetch', async () => {
    throw new Error('offline')
  })
  chooseRetryOrAbort.mock.mockImplementation(async () => 'a')
  assert.equal(await readReleaseState(['@zzjtnb/eslint-config']), undefined)
})
