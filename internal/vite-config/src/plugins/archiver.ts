import type { Plugin } from 'vite'

import type { ArchiverPluginOptions } from '../typing'

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

import { ZipArchive } from 'archiver'

/**
 * 在构建产物写入后生成 ZIP，并将写入失败传递给构建调用方。
 * @param options 归档文件名与相对 Vite root 的输出目录；归档不能写入产物目录内。
 * @returns 仅在构建期间运行、等待归档文件关闭的插件。
 */
export function viteArchiverPlugin(options: ArchiverPluginOptions = {}): Plugin {
  let root: string
  let outDir: string
  return {
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },
    writeBundle: {
      // 等待其他写入钩子完成，返回归档 Promise，避免构建成功先于 ZIP 落盘。
      order: 'post',
      sequential: true,
      async handler(outputOptions) {
        const { name = 'dist', outputDir = '.' } = options
        const folderToZip = resolve(root, outputOptions.dir ?? outDir)
        const zipOutputDir = resolve(root, outputDir)
        const zipOutputPath = resolve(zipOutputDir, `${name}.zip`)
        const relativeOutput = relative(folderToZip, zipOutputPath)
        if (relativeOutput === '' || (!isAbsolute(relativeOutput) && relativeOutput !== '..' && !relativeOutput.startsWith('../') && !relativeOutput.startsWith('..\\')))
          throw new Error('归档输出不能位于构建产物目录内，请调整 archiverPluginOptions.outputDir。')

        await fsp.mkdir(zipOutputDir, { recursive: true })
        await zipFolder(folderToZip, zipOutputPath)
      },
    },
    enforce: 'post',
    name: 'vite:archiver',
  }
}

async function zipFolder(folderPath: string, outputPath: string): Promise<void> {
  // directory 对缺失目录只发 warning；显式检查，避免产生“成功”的空归档。
  const directory = await fsp.stat(folderPath)
  if (!directory.isDirectory())
    throw new Error(`构建产物目录不存在：${folderPath}`)

  return new Promise((resolveZip, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = new ZipArchive({
      zlib: { level: 9 },
    })
    const fail = (error: Error) => {
      // 只释放本次归档持有的流；错误不能被日志吞掉后冒充构建完成。
      reject(error)
      archive.abort()
      output.destroy()
    }

    output.on('close', resolveZip)
    output.on('error', fail)
    archive.on('error', fail)
    archive.on('warning', fail)
    archive.pipe(output)
    archive.directory(folderPath, false)
    archive.finalize().catch(fail)
  })
}
