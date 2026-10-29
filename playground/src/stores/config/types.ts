import type { PlaygroundMode } from '../../../types'

/** 工具独立的配置草稿；源码始终是基础配置的唯一正文。 */
export interface ConfigDraft {
  /** 完整 ESM 配置模块。 */
  code: string
  /** 最后追加的规则覆盖，使用所属工具的正式值。 */
  overrides: Record<string, unknown>
  /** 当前解析和实验的虚拟相对路径。 */
  filename: string
}

/** 可视化编辑的有界工厂选项，无法保真处理时保留源码。 */
export interface FactoryOption {
  /** 正式共享配置工厂选项键。 */
  key: string
  /** 面向用户的选项名称。 */
  label: string
  /** 当前布尔值；动态表达式或不适用时为 null。 */
  value: boolean | null
  /** 是否能够在不改变其他源码的情况下修改。 */
  editable: boolean
}

/** 规则级别按钮表达的用户意图，Markdownlint 不提供 warn。 */
export type RuleLevel = 'off' | 'warn' | 'error'

/** 各工具正式规则值转换，输入来源由配置领域统一管理。 */
export type RuleConverters = Record<PlaygroundMode, (value: unknown, level: RuleLevel) => unknown>
