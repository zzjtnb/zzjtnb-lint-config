import type { LintRequest, LintResult, PlaygroundMode, RuleItem, ToolMetadata } from '../types.ts'

import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { applyFixes, getVersion } from 'markdownlint-cli2/markdownlint'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import stylelint from 'stylelint'

import { zzjtnb as eslintConfig } from '../../packages/eslint-config/src/index.ts'
import { zzjtnb as stylelintConfig } from '../../packages/stylelint-config/src/index.ts'
import { configurations } from '../src/data/configs.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const markdownPath = fileURLToPath(new URL('../../packages/markdownlint-config/index.jsonc', import.meta.url))
const eslintDefaults = eslintConfig({ pnpm: false })
const markdownDefaults = readConfig(markdownPath, [jsoncParse])
const metadata = new Map<string, Promise<ToolMetadata>>()

function status(value: unknown): RuleItem['status'] {
  const level = Array.isArray(value)
    ? value[0]
    : value
  if (level === null || level === undefined || level === false || level === 0 || level === 'off')
    return 'off'
  return level === 1 || level === 'warn'
    ? 'warn'
    : 'error'
}

function filePath(filename: string) {
  return `${root}playground/${filename}`
}

function assertTarget(mode: unknown, filename: unknown): asserts mode is PlaygroundMode {
  if (typeof mode !== 'string' || !Object.hasOwn(configurations, mode))
    throw new Error('不支持的检查工具。')
  if (typeof filename !== 'string' || !configurations[mode as PlaygroundMode].examples.some(example => example.filename === filename))
    throw new Error('请选择工作台提供的文件类型。')
}

/**
 * 校验本地运行器的输入，只接受示例文件名和待检查文本，不接受可执行配置。
 * @param value 请求体中的未知 JSON 值。
 * @returns 通过工具、文件名、文本类型及修复开关校验的请求。
 */
export function parseRequest(value: unknown): LintRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('请求必须是 JSON 对象。')
  const request = value as Record<string, unknown>
  assertTarget(request.mode, request.filename)
  if (typeof request.code !== 'string' || Buffer.byteLength(request.code) > 65_536)
    throw new Error('代码必须是文本，且不能超过 64 KiB。')
  if (typeof request.fix !== 'boolean')
    throw new TypeError('修复开关必须是布尔值。')
  return {
    mode: request.mode,
    filename: request.filename as string,
    code: request.code,
    fix: request.fix,
  }
}

async function createEslint(fix = false) {
  return new ESLint({
    cwd: root,
    fix,
    overrideConfigFile: true,
    overrideConfig: await eslintDefaults,
  })
}

async function resolveMetadata(mode: PlaygroundMode, filename: string): Promise<ToolMetadata> {
  if (mode === 'eslint') {
    const engine = await createEslint()
    const config = await engine.calculateConfigForFile(filePath(filename))
    if (!config)
      throw new Error('ESLint 未为该文件解析到可用配置。')
    const rules = Object.entries(config.rules ?? {}).map(([name, value]): RuleItem => {
      const slash = name.lastIndexOf('/')
      const plugin = slash < 0
        ? undefined
        : config.plugins?.[name.slice(0, slash)]
      const rule = plugin?.rules?.[name.slice(slash + 1)]
      const docs = typeof rule === 'object'
        ? rule.meta?.docs
        : undefined
      return {
        name,
        category: slash < 0
          ? '核心规则'
          : name.slice(0, slash),
        description: docs?.description ?? 'ESLint 核心代码约定',
        files: filename,
        status: status(value),
        value: JSON.stringify(value),
        url: docs?.url ?? (slash < 0
          ? `https://eslint.org/docs/latest/rules/${name}`
          : undefined),
      }
    })
    return {
      mode,
      filename,
      version: ESLint.version,
      rules,
    }
  }
  if (mode === 'stylelint') {
    const config = await stylelint.resolveConfig(filePath(filename), {
      config: stylelintConfig(),
    })
    if (!config)
      throw new Error('Stylelint 未为该文件解析到可用配置。')
    const rules = Object.entries(config.rules ?? {}).map(([name, value]): RuleItem => {
      const [primary, secondary] = Array.isArray(value)
        ? value
        : [value]
      // Stylelint 的首项是规则主选项，级别在第二项；不能复用 ESLint 的严重级别解析。
      const severity = secondary?.severity ?? config.defaultSeverity ?? 'error'
      return {
        name,
        category: name.includes('/')
          ? name.split('/')[0]!
          : '核心规则',
        description: name.includes('/')
          ? 'Stylelint 插件规则'
          : 'Stylelint 样式约定',
        files: filename,
        status: primary === null || primary === undefined || primary === false
          ? 'off'
          : severity === 'warning'
            ? 'warn'
            : 'error',
        value: JSON.stringify(value),
        url: name.includes('/')
          ? undefined
          : `https://stylelint.io/user-guide/rules/${name}`,
      }
    })
    return {
      mode,
      filename,
      version: JSON.parse(await readFile(require.resolve('stylelint/package.json'), 'utf8')).version,
      rules,
    }
  }
  const config = await markdownDefaults
  const schema = JSON.parse(await readFile(new URL('./schema/markdownlint-config-schema.json', import.meta.resolve('markdownlint-cli2')), 'utf8'))
  const rules = Object.entries(schema.properties as Record<string, { description: string }>)
    .filter(([name]) => /^MD\d{3}$/.test(name))
    .map(([name, definition]): RuleItem => {
      const parts = definition.description.split(' : ')
      const value = config[name] ?? config.default ?? true
      return {
        name,
        category: 'Markdown',
        description: parts[1] ?? name,
        files: filename,
        status: status(value),
        value: JSON.stringify(value),
        url: parts[2],
      }
    })
  return {
    mode,
    filename,
    version: getVersion(),
    rules,
  }
}

/**
 * 获取当前源码针对指定文件实际解析的规则，不返回维护中的静态规则副本。
 * @param mode 检查工具。
 * @param filename 工作台允许的虚拟文件名。
 * @returns 引擎版本与实际规则；同一开发服务生命周期内合并相同目标的读取。
 */
export function getMetadata(mode: PlaygroundMode, filename: string): Promise<ToolMetadata> {
  assertTarget(mode, filename)
  const key = `${mode}/${filename}`
  let pending = metadata.get(key)
  if (!pending) {
    pending = resolveMetadata(mode, filename).catch((error) => {
      metadata.delete(key)
      throw error
    })
    metadata.set(key, pending)
  }
  return pending
}

/**
 * 使用当前共享默认配置检查内存中的代码，可应用引擎支持的自动修复。
 * @param request 已校验的目标、文本与修复意图；不读取或写回用户文件。
 * @returns 最终文本、真实诊断和实际处理耗时。
 */
export async function runLint(request: LintRequest): Promise<LintResult> {
  const started = performance.now()
  const { mode, filename, code, fix } = request
  let output = code
  let diagnostics: LintResult['diagnostics']
  if (mode === 'eslint') {
    const engine = await createEslint(fix)
    const [result] = await engine.lintText(code, {
      filePath: filePath(filename),
    })
    if (!result)
      throw new Error('ESLint 未返回检查结果。')
    output = result.output ?? code
    diagnostics = result.messages.map(message => ({
      line: message.line,
      column: message.column,
      rule: message.ruleId ?? undefined,
      message: message.message,
      severity: message.severity === 2
        ? 'error'
        : 'warning',
    }))
  }
  else if (mode === 'stylelint') {
    const options = {
      codeFilename: filePath(filename),
      config: stylelintConfig(),
      cache: false,
    }
    let result = await stylelint.lint({ ...options, code, fix })
    output = result.code ?? code
    // 属性排序等修复会改变行号，重新检查最终文本才能准确定位剩余诊断。
    if (fix && output !== code)
      result = await stylelint.lint({ ...options, code: output, fix: false })
    const file = result.results[0]
    if (!file || file.ignored)
      throw new Error('Stylelint 未检查该文件。')
    // 配置错误属于运行失败，不是用户代码“没有问题”；Stylelint 不会把它放进 warnings。
    if (file.invalidOptionWarnings.length > 0)
      throw new Error(`Stylelint 配置无效：${file.invalidOptionWarnings.map(warning => warning.text).join('；')}`)
    diagnostics = file.warnings.map(warning => ({
      line: warning.line,
      column: warning.column,
      rule: warning.rule,
      message: warning.text,
      severity: warning.severity === 'error'
        ? 'error'
        : 'warning',
    }))
    diagnostics.push(...file.parseErrors.map(error => ({
      line: error.line,
      column: error.column,
      message: error.text,
      severity: 'error' as const,
    })))
  }
  else {
    const config = await markdownDefaults
    let result = await lint({
      config,
      strings: { [filename]: code },
    })
    if (fix) {
      output = applyFixes(code, result[filename] ?? [])
      result = await lint({
        config,
        strings: { [filename]: output },
      })
    }
    diagnostics = (result[filename] ?? []).map(error => ({
      line: error.lineNumber,
      column: error.errorRange?.[0],
      rule: error.ruleNames[0],
      message: [error.ruleDescription, error.errorDetail].filter(Boolean).join(' · '),
      severity: 'error',
    }))
  }
  return {
    mode,
    filename,
    output,
    diagnostics,
    durationMs: performance.now() - started,
  }
}
