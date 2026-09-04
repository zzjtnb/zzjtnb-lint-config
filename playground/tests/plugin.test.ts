import type { AddressInfo } from 'node:net'
import type { ViteDevServer } from 'vite'

import { Buffer } from 'node:buffer'
import { request } from 'node:http'
import { createServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { playgroundApi } from '../plugins/api.ts'

let server: ViteDevServer
let origin: string

beforeAll(async () => {
  server = await createServer({
    configFile: false,
    plugins: [
      playgroundApi(),
    ],
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  origin = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`
})

afterAll(async () => {
  await server?.close()
})

describe('本地运行器 HTTP 契约', () => {
  it('通过实际 HTTP 读取规则，并明确禁用缓存', async () => {
    const response = await fetch(`${origin}/api/playground/meta?mode=markdownlint&filename=sample.md`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await response.json()).rules.length).toBeGreaterThan(20)
  })

  it.each([
    ['GET', '/lint', undefined, 405],
    ['POST', '/meta', undefined, 405],
    [
      'POST',
      '/lint',
      { 'Content-Type': 'text/plain' },
      415,
    ],
    [
      'POST',
      '/lint',
      { 'Content-Type': 'application/json-invalid' },
      415,
    ],
    [
      'POST',
      '/lint',
      { 'Content-Type': 'application/json', 'Origin': 'https://example.com' },
      403,
    ],
  ] as const)('拒绝不受支持的方法、格式或来源：%s %s %j', async (method, path, headers, status) => {
    const response = await fetch(`${origin}/api/playground${path}`, { method, headers })
    expect(response.status).toBe(status)
    expect((await response.json()).error).toBeTruthy()
  })

  it.each([
    ['无效 JSON', '{'],
    [
      '未知工具',
      JSON.stringify({
        mode: 'constructor',
        filename: 'sample.md',
        code: '',
        fix: false,
      }),
    ],
    [
      '任意文件路径',
      JSON.stringify({
        mode: 'markdownlint',
        filename: '../../package.json',
        code: '',
        fix: false,
      }),
    ],
    [
      '超过代码上限',
      JSON.stringify({
        mode: 'markdownlint',
        filename: 'sample.md',
        code: 'a'.repeat(65_537),
        fix: false,
      }),
    ],
  ])('对输入边界返回可恢复错误：%s', async (_label, body) => {
    const response = await fetch(`${origin}/api/playground/lint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBeTruthy()
  })

  it('相同主机但不同协议不属于同源，拒绝跨协议请求', async () => {
    const response = await fetch(`${origin}/api/playground/meta?mode=markdownlint&filename=sample.md`, {
      headers: {
        Origin: origin.replace('http:', 'https:'),
      },
    })
    expect(response.status).toBe(403)
  })

  it('真实同源请求仍可检查文本', async () => {
    const response = await fetch(`${origin}/api/playground/lint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': origin },
      body: JSON.stringify({
        mode: 'markdownlint',
        filename: 'sample.md',
        code: '# 标题\n',
        fix: false,
      }),
    })
    expect(response.status).toBe(200)
  })

  it('空来源不作为合法同源请求受理', async () => {
    const response = await fetch(`${origin}/api/playground/meta?mode=markdownlint&filename=sample.md`, {
      headers: { Origin: 'null' },
    })
    expect(response.status).toBe(403)
  })

  it('拒绝超过请求体上限的数据', async () => {
    const response = await fetch(`${origin}/api/playground/lint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ' '.repeat(70_001),
    })
    expect(response.status).toBe(413)
  })

  it('中文 UTF-8 跨传输块时仍保留原文，并完成实际检查', async () => {
    const code = '# 中文标题\n\n正文内容。\n'
    const body = Buffer.from(JSON.stringify({
      mode: 'markdownlint',
      filename: 'sample.md',
      code,
      fix: false,
    }))
    const split = body.indexOf(Buffer.from('中')) + 1
    const result = await new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
      const outgoing = request(`${origin}/api/playground/lint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (incoming) => {
        const chunks: Buffer[] = []
        incoming.on('data', chunk => chunks.push(Buffer.from(chunk)))
        incoming.on('end', () => resolve({
          status: incoming.statusCode,
          body: Buffer.concat(chunks).toString('utf8'),
        }))
        incoming.on('error', reject)
      })
      outgoing.on('error', reject)
      outgoing.write(body.subarray(0, split))
      setImmediate(() => outgoing.end(body.subarray(split)))
    })
    expect(result.status).toBe(200)
    expect(JSON.parse(result.body).output).toBe(code)
    expect(JSON.parse(result.body).diagnostics).toEqual([])
  })
})
