import type { ParseError } from 'jsonc-parser'
/** 通过 CLI2 正式入口验证共享规则、扫描默认值与消费方覆盖。 */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import { createRequire, findPackageJSON } from 'node:module'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { parse } from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const markdownConfigPath = createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config')
const manifestPath = findPackageJSON('markdownlint-cli2', import.meta.url)!
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const markdownlintCli = resolve(dirname(manifestPath), manifest.bin['markdownlint-cli2'])
const temporaryRoot = fileURLToPath(new URL('../../../.tmp/markdownlint-consumers/', import.meta.url))

/** 在隔离文件目录运行真实 CLI；失败保留 CLI 的退出状态与完整诊断。 */
async function check(source: string, config: Record<string, unknown> = { extends: markdownConfigPath }, customRules: string[] = []) {
  await fs.mkdir(temporaryRoot, { recursive: true })
  const cwd = await fs.mkdtemp(resolve(temporaryRoot, 'case-'))
  await fs.writeFile(resolve(cwd, 'sample.md'), source)
  await fs.writeFile(resolve(cwd, '.markdownlint-cli2.jsonc'), JSON.stringify({
    // 测试目录位于仓库 .tmp，必须显式关闭 Git 忽略，才能验证实际文件输入。
    gitignore: false,
    // 使用真实共享规则或测试指定的本地继承配置。
    config,
    // 自定义规则通过 CLI2 正式模块加载入口传递，不直接导入未声明类型的引擎 API。
    customRules,
  }))
  return execFileAsync(process.execPath, [markdownlintCli, 'sample.md'], { cwd })
}

// 每项验证会多次启动真实 CLI，按集成测试给予启动与文件扫描时间。
describe('消费项目的 Markdownlint 配置', { timeout: 30_000 }, () => {
  it.each([
    ['MD001', '# 标题\n\n### 跳级\n'],
    ['MD013', `# 标题\n\n${'word '.repeat(30).trim()}\n`],
    ['MD024', '# 标题\n\n## 一\n\n### 示例\n\n## 二\n\n### 示例\n'],
    ['MD033', '# 标题\n\n<div>内容</div>\n'],
    ['MD041', '正文开头\n'],
    ['MD059', '# 标题\n\n[here](https://example.com)\n'],
    ['MD060', '# 标题\n\n| A | B |\n| --- | --- |\n| long text|short |\n'],
  ])('%s 的本包默认值与上游实际检查行为不同，消费方可恢复上游', async (rule, source) => {
    await check(source)
    await expect(check(source, { default: false, [rule]: true })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(rule),
    })
    await expect(check(source, { extends: markdownConfigPath, [rule]: true })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(rule),
    })
  })

  it('mD003 的 ATX 约束区别于上游 consistent，消费方可恢复默认', async () => {
    const source = '标题\n====\n'
    await check(source, { default: false, MD003: true })
    await expect(check(source)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('MD003'),
    })
    await check(source, { extends: markdownConfigPath, MD003: true })
  })

  it('差异验证覆盖共享规则的全部声明', async () => {
    const source = await fs.readFile(markdownConfigPath, 'utf8')
    const config = parse(source)
    expect(Object.keys(config).sort()).toEqual([
      'MD001',
      'MD003',
      'MD013',
      'MD024',
      'MD033',
      'MD041',
      'MD059',
      'MD060',
    ])
  })

  it('共享 JSONC 规则保留用途说明和对应的官方文档链接', async () => {
    const source = await fs.readFile(markdownConfigPath, 'utf8')
    const errors: ParseError[] = []
    const config = parse(source, errors)
    expect(errors).toEqual([])
    for (const name of Object.keys(config).filter(name => /^MD\d{3}$/.test(name))) {
      expect(source).toContain(`// ${name}：`)
      expect(source).toContain(`https://github.com/DavidAnson/markdownlint/blob/v0.42.0/doc/${name.toLowerCase()}.md`)
    }
  })

  it('消费方可以用 HTML 标签白名单覆盖共享默认值', async () => {
    const config = {
      extends: fileURLToPath(new URL('./fixtures/html-allowed.jsonc', import.meta.url)),
    }
    await check('<br>\n\n<details>\n<summary>说明</summary>\n</details>\n', config)
    await expect(check('<div>说明</div>\n', config)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('MD033'),
    })
  })

  it('允许长行、HTML 及不同章节下的同名小节', async () => {
    await check(`${'正文'.repeat(100)}\n\n<div>说明</div>\n\n## 第一部分\n\n### 示例\n\n## 第二部分\n\n### 示例\n`)
  })

  it('仍会报告同级重复标题', async () => {
    await expect(check('# 标题\n\n## 重复\n\n## 重复\n')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('MD024'),
    })
  })

  it('原生 extends 允许消费方重新启用共享配置中关闭的规则', async () => {
    await expect(check(`${'正文'.repeat(100)}\n`, {
      // 本地规则文件在继承共享规则后重新启用 MD013。
      extends: fileURLToPath(new URL('./fixtures/line-length.jsonc', import.meta.url)),
    })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('MD013'),
    })
  })

  it('消费方可以按规则名关闭已加载的自定义规则', async () => {
    await check('# 说明\n\nTODO: 补充内容。\n', {
      // 继承共享规则后按名称关闭已加载的项目规则。
      'extends': markdownConfigPath,
      'project-no-todo': false,
    }, [
      fileURLToPath(new URL('./fixtures/no-todo.js', import.meta.url)),
    ])
  })

  it('通过 CLI2 继承共享配置并加载项目自定义规则', async () => {
    const configPath = fileURLToPath(new URL('./fixtures/custom-rule.jsonc', import.meta.url))
    const completePath = fileURLToPath(new URL('./fixtures/complete.md', import.meta.url))
    const pendingPath = fileURLToPath(new URL('./fixtures/pending.md', import.meta.url))
    await execFileAsync(process.execPath, [
      markdownlintCli,
      '--config',
      configPath,
      completePath,
    ])
    await expect(execFileAsync(process.execPath, [
      markdownlintCli,
      '--config',
      configPath,
      pendingPath,
    ]))
      .rejects
      .toMatchObject({
        code: 1,
        stderr: expect.stringContaining('project-no-todo'),
      })
  }, 30_000)

  it('公开 CLI2 入口默认忽略索引、临时目录和生成物，同时保留正常文档检查', async () => {
    await fs.mkdir(temporaryRoot, { recursive: true })
    const cwd = await fs.mkdtemp(resolve(temporaryRoot, 'ignores-'))
    const entry = createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config/config')
    await fs.writeFile(resolve(cwd, '.markdownlint-cli2.mjs'), `import config from ${JSON.stringify(pathToFileURL(entry).href)}; export default { ...config, gitignore: false }`)
    for (const folder of [
      '.codegraph',
      'nested/.codegraph',
      '.tmp',
      'nested/.tmp',
      '.git',
      'nested/.git',
      '.cache',
      'nested/.cache',
      '.output',
      'nested/.output',
      '.nuxt',
      '.wrangler',
      'releases',
      'src-tauri',
      'backup',
      'node_modules',
    ]) {
      await fs.mkdir(resolve(cwd, folder), { recursive: true })
      await fs.writeFile(resolve(cwd, folder, 'bad.md'), '# A\n\n## 重复\n\n## 重复\n')
    }
    await fs.writeFile(resolve(cwd, 'README.md'), '# 正常文档\n')
    await execFileAsync(process.execPath, [
      markdownlintCli,
      '**/*.md',
      '.nuxt/*.md',
      '.wrangler/*.md',
      '.codegraph/*.md',
      'nested/.codegraph/*.md',
      '.tmp/*.md',
      'nested/.tmp/*.md',
      '.git/*.md',
      'nested/.git/*.md',
      '.cache/*.md',
      'nested/.cache/*.md',
      '.output/*.md',
      'nested/.output/*.md',
    ], { cwd })
    await fs.writeFile(resolve(cwd, 'README.md'), '# A\n\n## 重复\n\n## 重复\n')
    await expect(execFileAsync(process.execPath, [markdownlintCli, '**/*.md'], { cwd }))
      .rejects
      .toMatchObject({
        code: 1,
        stderr: expect.stringContaining('MD024'),
      })
  }, 30_000)
})
