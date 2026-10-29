import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { parse } from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

describe('markdownlint 发布入口', () => {
  it('通过 Markdownlint 包入口加载无需构建的 JSONC 规则', () => {
    // 从包自身验证 exports，无需额外安装或建立工作区软链接。
    const markdownRequire = createRequire(new URL('../package.json', import.meta.url))
    const entry = markdownRequire.resolve('@zzjtnb/markdownlint-config')
    expect(entry).toBe(fileURLToPath(new URL('../index.jsonc', import.meta.url)))
    expect(parse(readFileSync(entry, 'utf8'))).toMatchObject({ MD013: false })
  })
})
