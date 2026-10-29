/** 真实按键事件验证方向键、快捷键与输入资源恢复，不启动外部命令。 */
import assert from 'node:assert/strict'
import process from 'node:process'
import { afterEach, it, mock } from 'node:test'

const close = mock.fn()
mock.module('node:readline', {
  exports: {
    emitKeypressEvents: () => {},
  },
})
mock.module('node:readline/promises', {
  exports: {
    createInterface: () => ({ close }),
  },
})
const { chooseMenu, closePrompt } = await import('../prompt.js')
afterEach(() => {
  closePrompt()
  mock.restoreAll()
})

for (const [keys, expected] of [
  [
    [
      { name: 'return' },
    ],
    'a',
  ],
  [
    [
      { name: 'up' },
      { name: 'return' },
    ],
    'b',
  ],
  [
    [
      { name: 'down' },
      { name: 'down' },
      { name: 'return' },
    ],
    'a',
  ],
  [
    [
      { name: 'unknown' },
      { name: 'b' },
    ],
    'b',
  ],
]) {
  it(`菜单按键 ${keys.map(key => key.name).join(' → ')} 返回 ${expected} 并恢复终端`, async () => {
    const descriptors = [
      [process.stdin, 'isTTY'],
      [process.stdout, 'isTTY'],
      [process.stdin, 'setRawMode'],
    ].map(([object, key]) => [
      object,
      key,
      Object.getOwnPropertyDescriptor(object, key),
    ])
    const raw = mock.fn()
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true })
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })
    Object.defineProperty(process.stdin, 'setRawMode', { configurable: true, value: raw })
    mock.method(process.stdin, 'resume', () => {})
    mock.method(process.stdout, 'write', () => true)
    const before = process.stdin.listenerCount('keypress')
    try {
      const choice = chooseMenu('选择发布包', [
        { key: 'a', label: '全部', description: '发布全部包' },
        { key: 'b', label: '单包', description: '发布单个包' },
      ])
      for (const key of keys) process.stdin.emit('keypress', '', key)
      assert.equal(await choice, expected)
      assert.equal(process.stdin.listenerCount('keypress'), before)
      assert.deepEqual(raw.mock.calls.map(call => call.arguments), [
        [true],
        [false],
      ])
    }
    finally {
      for (const [object, key, descriptor] of descriptors) {
        if (descriptor)
          Object.defineProperty(object, key, descriptor)
        else delete object[key]
      }
    }
  })
}
