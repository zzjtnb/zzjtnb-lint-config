import type { OptionsConfig } from '@antfu/eslint-config'

/** 默认不在 antfu 之外猜测消费方目录；项目特有路径通过 `ignores` 显式追加。 */
export const defaultIgnores: string[] = []

/**
 * 默认忽略项工厂。
 *
 * 返回新数组而不是直接暴露默认数组，避免消费方追加目录时意外修改
 * 共享配置包中的全局默认值。
 */
export async function ignores(): Promise<string[]> {
  return [...defaultIgnores]
}

/**
 * 合并上游忽略项、本包忽略项和消费方忽略项。
 *
 * `@antfu/eslint-config` 传入函数时会提供它自己的忽略列表；传入
 * `defaultIgnores: false` 时，函数也不会再收到上游默认忽略项。
 */
export function resolveIgnores(
  ignores: OptionsConfig['ignores'] = [],
  defaultIgnoreList: string[] | false = defaultIgnores,
): OptionsConfig['ignores'] {
  if (defaultIgnoreList === false) {
    return typeof ignores === 'function'
      ? () => ignores([])
      : () => ignores
  }

  // 函数形式需要收到 antfu 原始忽略列表，再由消费方决定如何扩展。
  if (typeof ignores === 'function') {
    return originals => ignores([...originals, ...defaultIgnoreList])
  }

  return [...defaultIgnoreList, ...ignores]
}
