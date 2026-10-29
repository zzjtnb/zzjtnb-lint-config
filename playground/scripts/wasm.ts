/** 将 modern-monaco 的内联 Oniguruma 二进制提取为独立资源，保持原引擎和导出契约。 */
import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'

/** 只在生产构建处理对应模块；上游封装变化时明确失败，不静默丢失语法高亮。 */
export function editorWasm(): Plugin {
  return {
    name: 'editor-wasm-asset',
    apply: 'build',
    transform(source, id) {
      if (!id.replaceAll('\\', '/').endsWith('/modern-monaco/dist/shiki-wasm.mjs'))
        return
      const encoded = /Uint8Array\.from\(atob\("([A-Za-z0-9+/=]+)"\)/.exec(source)?.[1]
      if (!encoded)
        throw new Error('modern-monaco 的 WASM 封装已变化，请重新核对资源提取方式')
      const asset = this.emitFile({
        type: 'asset',
        name: 'editor-oniguruma.wasm',
        source: Buffer.from(encoded, 'base64'),
      })
      return {
        // 浏览器直接编译原始二进制，不再解析 Base64 JavaScript；重复初始化复用编译结果。
        code: `let compiled;
export async function getWasmInstance(imports) {
  compiled ??= WebAssembly.compileStreaming(fetch(import.meta.ROLLUP_FILE_URL_${asset}));
  return (await WebAssembly.instantiate(await compiled, imports)).exports;
}`,
        map: null,
      }
    },
  }
}
