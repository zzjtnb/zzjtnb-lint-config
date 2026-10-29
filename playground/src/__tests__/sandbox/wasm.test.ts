/** 验证提取的是编辑器当前使用的同一份 WASM，而非替换版本或重新实现引擎。 */
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { findPackageJSON } from 'node:module'
import { dirname, join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { editorWasm } from '../../../scripts/wasm'

it('编辑器二进制按原字节输出，运行模块保留异步实例导出', async () => {
  const filename = join(dirname(findPackageJSON('modern-monaco/core', import.meta.url)!), 'dist', 'shiki-wasm.mjs')
  const source = await readFile(filename, 'utf8')
  const emitFile = vi.fn(() => 'wasm-asset')
  const transform = editorWasm().transform
  if (typeof transform !== 'function')
    throw new TypeError('WASM 构建插件未提供 transform')
  const result = await Reflect.apply(transform, { emitFile }, [source, filename])
  const binary = emitFile.mock.calls[0]![0].source
  const encoded = /atob\("([A-Za-z0-9+/=]+)"\)/.exec(source)![1]!
  expect(binary).toEqual(Buffer.from(encoded, 'base64'))
  expect(WebAssembly.validate(binary)).toBe(true)
  expect(result.code).toContain('export async function getWasmInstance(imports)')
  expect(result.code).not.toContain('atob(')
  expect(result.code).toContain('import.meta.ROLLUP_FILE_URL_wasm-asset')
  expect(await Reflect.apply(transform, { emitFile }, ['export {}', '/unrelated.js'])).toBeUndefined()
  expect(() => Reflect.apply(transform, { emitFile }, ['export {}', filename])).toThrow('封装已变化')
}, 30_000)
