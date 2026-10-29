/** 用模块替身验证交互入口的停止条件；不登录、不改版本、不发布。 */
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import process from 'node:process'
import { it } from 'node:test'
import { promisify } from 'node:util'

const execute = promisify(execFile)

for (const failure of [
  'ensureLogin',
  'readReleaseState',
  'confirmVersionPlan',
  'applyVersionPlan',
  'readAfterWrite',
  'mismatch',
  'releaseCheck',
  'releasePack',
  'publishPackages',
  'none',
]) {
  it(`交互发布在 ${failure} 阶段验证结果后才继续，并始终关闭输入`, async () => {
    const source = `
      import { mock } from 'node:test'
      import process from 'node:process'
      import { fileURLToPath } from 'node:url'
      const failure = ${JSON.stringify(failure)}
      const events = []
      const record = name => { events.push(name); return failure !== name }
      const state = [{ name: '@zzjtnb/eslint-config', local: '1.0.6' }]
      const base = ${JSON.stringify(new URL('../', import.meta.url).href)}
      const stub = (file, exports) => mock.module(new URL(file, base).href, { exports })
      stub('packages.js', { choosePublishPackages: async () => { record('choosePublishPackages'); return state.map(item => item.name) } })
      stub('plan.js', {
        confirmVersionPlan: async () => record('confirmVersionPlan') ? new Map([[state[0].name, '1.0.6']]) : undefined,
        applyVersionPlan: async () => record('applyVersionPlan'),
      })
      let reads = 0
      stub('registry.js', {
        ensureLogin: async () => record('ensureLogin'),
        readReleaseState: async () => {
          const step = reads++ ? 'readAfterWrite' : 'readReleaseState'
          if (!record(step)) return undefined
          return failure === 'mismatch' && reads === 2 ? [{ ...state[0], local: '1.0.5' }] : state
        },
      })
      stub('prompt.js', { openPrompt: () => record('openPrompt'), closePrompt: () => record('closePrompt') })
      stub('publish.js', Object.fromEntries(['releaseCheck', 'releasePack', 'publishPackages', 'printPublishedInfo'].map(name => [name, async () => record(name)])))
      Object.defineProperty(process.stdin, 'isTTY', { value: true })
      Object.defineProperty(process.stdout, 'isTTY', { value: true })
      delete process.env.CI
      const entry = new URL('index.js', base)
      process.argv = [process.execPath, fileURLToPath(entry)]
      mock.module('node:util', { exports: { parseArgs: () => ({ values: {} }) } })
      process.on('beforeExit', () => console.log('EVENTS:' + JSON.stringify(events)))
      await import(entry.href)
    `
    let result
    try {
      result = await execute(process.execPath, [
        '--experimental-test-module-mocks',
        '--input-type=module',
        '--eval',
        source,
      ])
      assert.equal(failure, 'none')
    }
    catch (error) {
      assert.notEqual(failure, 'none')
      assert.equal(error.code, 1)
      result = error
    }
    const events = JSON.parse(result.stdout.match(/EVENTS:(.+)/)[1])
    const expected = [
      'openPrompt',
      'ensureLogin',
      'choosePublishPackages',
      'readReleaseState',
      'confirmVersionPlan',
      'applyVersionPlan',
      'readAfterWrite',
      'releaseCheck',
      'releasePack',
      'publishPackages',
      'printPublishedInfo',
    ]
    const stop = failure === 'mismatch'
      ? 'readAfterWrite'
      : failure
    const count = failure === 'none'
      ? expected.length
      : expected.indexOf(stop) + 1
    assert.deepEqual(events, [
      ...expected.slice(0, count),
      'closePrompt',
    ], result.stderr)
    if (failure === 'mismatch')
      assert.match(result.stderr, /版本写入结果与计划不一致/)
  })
}
