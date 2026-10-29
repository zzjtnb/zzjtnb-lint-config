import type { RuleItem, ToolMetadata } from '../../types'
import { readFile } from 'node:fs/promises'
import { getVersion } from 'markdownlint-cli2/markdownlint'
import { readConfig } from 'markdownlint-cli2/markdownlint/promise'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import { require, severity } from '../utils/index'

const markdownDefaults = readConfig(require.resolve('@zzjtnb/markdownlint-config'), [jsoncParse])

/**
 * 解析 markdownlint 针对虚拟文件的实际配置及规则元数据。
 * @param filename 生成入口允许的虚拟文件名。
 * @returns 静态发布的数据，不包含可执行函数。
 */
export async function inspect(filename: string): Promise<ToolMetadata> {
  const mode = 'markdownlint' as const
  const config = await markdownDefaults
  const schema = JSON.parse(await readFile(new URL('./schema/markdownlint-config-schema.json', import.meta.resolve('markdownlint-cli2')), 'utf8'))
  const rules = Object.entries(schema.properties as Record<string, { description: string }>)
    .filter(([name]) => /^MD\d{3}$/.test(name))
    .map(([name, definition]): RuleItem => {
      const parts = definition.description.split(' : ')
      const value = config[name] ?? config.default ?? true
      return {
        name,
        category: 'markdownlint',
        description: parts[1] ?? '',
        files: filename,
        configured: Object.hasOwn(config, name),
        status: severity(value),
        value: JSON.stringify(value),
        url: parts[2],
        sources: [],
      }
    })
  return {
    mode,
    filename,
    version: getVersion(),
    rules,
    configs: [
      {
        name: '@zzjtnb/markdownlint-config',
        index: 1,
        files: ['**/*.md'],
        ignores: [],
        rules: config,
      },
    ],
  }
}
