/** 本包测试的路径配置，不属于公开运行时或发布入口。 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporary = join(root, '.tmp/project/stylelint/tests')

/** 固定路径在此维护，末尾分隔符用于 mkdtemp 的独立实例。 */
export const paths = {
  root,
  compiler: join(root, 'node_modules/typescript/bin/tsc'),
  types: join(temporary, 'types/consumer/'),
}
