/** 本包插件入口：提供元信息与规则定义；启用策略由配置工厂维护。 */
import type { ESLint } from 'eslint'
import manifest from '../../../package.json' with { type: 'json' }
import importExtensions from './rules/import-extensions'

const plugin = {
  // 版本与发布包保持同一来源，namespace 对应规则访问前缀。
  meta: { name: manifest.name, version: manifest.version, namespace: 'zzjtnb' },
  rules: { 'import-extensions': importExtensions },
} satisfies ESLint.Plugin

export default plugin
