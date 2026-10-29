/** 汇总外部插件与本包插件；上游已管理的插件不重复注册。 */
import type { Linter } from 'eslint'
import { plugin as shadcn } from '@shadcn/lint'
import zzjtnb from './zzjtnb'

export const plugins = { shadcn, zzjtnb } satisfies NonNullable<Linter.Config['plugins']>
