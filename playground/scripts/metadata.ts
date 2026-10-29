import type { PlaygroundMode, RuleItem } from '../types'

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { configurations } from '../src/stores/config/catalog'
import { inspect as eslint } from './lib/eslint'
import { inspect as markdownlint } from './lib/markdownlint'
import { inspect as stylelint } from './lib/stylelint'

const inspectors = { eslint, stylelint, markdownlint }

// 数据生成是独立构建步骤，失败时中断 dev/build，不以旧数据冒充成功。
const output = fileURLToPath(new URL('../public/metadata/', import.meta.url))
for (const mode of Object.keys(configurations) as PlaygroundMode[]) {
  await mkdir(`${output}${mode}`, { recursive: true })
  const rules = new Map<string, RuleItem>()
  for (const { filename } of configurations[mode].targets) {
    const data = await inspectors[mode](filename)
    await writeFile(`${output}${mode}/${filename}.json`, JSON.stringify(data))
    for (const rule of data.rules) {
      if (!rules.has(rule.name))
        rules.set(rule.name, rule)
    }
  }
  // 跨支持类型的完整定义只生成一份，不让当前文件的有效子集决定目录范围。
  await writeFile(`${output}${mode}/catalog.json`, JSON.stringify({
    rules: [
      ...rules.values(),
    ],
  }))
}
await writeFile(`${output}manifest.json`, JSON.stringify(configurations))
