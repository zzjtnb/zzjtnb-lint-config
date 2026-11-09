/** 跨工作区工程测试的固定路径。 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const paths = {
  root,
  repository: resolve(root, '../..'),
  modules: join(root, '.tmp/project/paths/tests/modules/'),
  workspace: join(root, '.tmp/project/turbo/tests/isolation/workspace/'),
}
