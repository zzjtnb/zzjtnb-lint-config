import type { Plugin } from 'vite'
import type { PlaygroundMode } from '../types.ts'

import { Buffer } from 'node:buffer'
import { TLSSocket } from 'node:tls'

import { getMetadata, parseRequest, runLint } from './engine.ts'

/**
 * 为本地工作台提供只处理内存文本的 lint 接口；仅挂载于 Vite 开发服务。
 * @returns 不在生产构建或预览服务中注册接口的 Vite 插件。
 */
export function playgroundApi(): Plugin {
  return {
    name: 'playground-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        if (url.pathname !== '/api/playground/meta' && url.pathname !== '/api/playground/lint')
          return next()
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        const send = (status: number, value: unknown) => {
          response.statusCode = status
          response.end(JSON.stringify(value))
        }
        try {
          // Origin 由协议、主机及端口共同确定；仅比较 host 会放行跨协议来源。
          // 不信任客户端提供的转发协议头，HTTPS 依据当前连接判断。
          const protocol = request.socket instanceof TLSSocket && request.socket.encrypted
            ? 'https'
            : 'http'
          const origin = `${protocol}://${request.headers.host}`
          if (request.headers.origin && request.headers.origin !== origin)
            return send(403, { error: '不允许跨来源调用本地运行器。' })
          if (url.pathname.endsWith('/meta')) {
            if (request.method !== 'GET')
              return send(405, { error: '规则读取仅支持 GET。' })
            return send(200, await getMetadata(url.searchParams.get('mode') as PlaygroundMode, url.searchParams.get('filename') ?? ''))
          }
          if (request.method !== 'POST')
            return send(405, { error: '代码检查仅支持 POST。' })
          if (request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json')
            return send(415, { error: '请使用 application/json。' })
          const chunks: Buffer[] = []
          let bytes = 0
          for await (const chunk of request) {
            bytes += Buffer.byteLength(chunk)
            if (bytes <= 70_000)
              chunks.push(Buffer.from(chunk))
          }
          if (bytes > 70_000)
            return send(413, { error: '请求超过运行器允许的大小。' })
          const input = parseRequest(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          return send(200, await runLint(input))
        }
        catch (error) {
          return send(400, {
            error: error instanceof Error
              ? error.message
              : '本地运行器未能完成请求。',
          })
        }
      })
    },
  }
}
