/** 本包测试的路径配置，不属于公开运行时或发布入口。 */
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporary = join(root, '.tmp/project/eslint/tests')

/** 固定路径在此维护，末尾分隔符用于 mkdtemp 的独立实例。 */
export const paths = {
  root,
  compiler: join(root, 'node_modules/typescript/bin/tsc'),
  imports: join(temporary, 'imports/consumer/'),
  loading: join(temporary, 'loading/consumer/'),
  nest: join(temporary, 'nest/consumer/'),
  typeAware: join(temporary, 'type-aware/consumer/'),
  pnpmSettings: join(temporary, 'pnpm/settings/consumer/'),
  pnpmAutofix: join(temporary, 'pnpm/autofix/consumer/'),
  catalog: join(temporary, 'catalog/consumer/'),
  // 无 workspace 的用例也必须位于仓库外，避免向上发现当前仓库配置。
  npmConsumer: join(tmpdir(), 'zzjtnb-lint-config/eslint/npm/consumer/'),
  // 无依赖检测必须避开包自身的 TypeScript，使用仓库外的独立消费目录。
  detection: {
    consumers: join(tmpdir(), 'zzjtnb-lint-config/eslint/detection/consumer/'),
    scripts: join(temporary, 'detection/scripts/'),
  },
}
