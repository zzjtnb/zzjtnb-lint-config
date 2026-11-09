/** 工作台 Node.js 脚本与测试的路径配置，不进入浏览器应用代码。 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const repository = resolve(root, '..')
const temporary = join(root, '.tmp/project')
const generation = join(temporary, 'playground/generation')
const screenshots = join(temporary, 'playwright/screenshots')

/** 固定目录与各工具产物在此定义，使用处只读取所需字段。 */
export const paths = {
  root,
  metadata: join(root, 'public/metadata/'),
  runtime: join(root, 'public/runtime'),
  packages: {
    eslint: join(repository, 'packages/eslint'),
    stylelint: join(repository, 'packages/stylelint'),
    markdownlint: join(repository, 'packages/markdownlint'),
  },
  bundle: join(generation, 'eslint'),
  defaultModules: join(generation, 'defaults'),
  defaults: {
    eslint: join(generation, 'defaults/eslint.mjs'),
    stylelint: join(generation, 'defaults/stylelint.mjs'),
  },
  lockfiles: {
    eslint: join(generation, 'lockfiles/eslint'),
    stylelint: join(generation, 'lockfiles/stylelint'),
    markdownlint: join(generation, 'lockfiles/markdownlint'),
  },
  tests: {
    imports: join(temporary, 'playground/tests/imports/consumer'),
    manifest: join(temporary, 'playground/tests/manifest/package'),
    warmup: join(temporary, 'playground/tests/warmup/runner'),
    files: join(temporary, 'playwright/tests/files'),
  },
  reports: join(temporary, 'playwright/reports'),
  results: join(temporary, 'playwright/results'),
  screenshots: {
    editor: join(screenshots, 'editor/console.png'),
    ready: join(screenshots, 'refinement/tools-ready.png'),
    desktop: join(screenshots, 'refinement/actions-desktop.png'),
    mobile: join(screenshots, 'refinement/actions-mobile.png'),
    files: join(screenshots, 'implementation/files-verified.png'),
    stats: join(screenshots, 'implementation/stats-verified.png'),
    matching: join(screenshots, 'matching/fragment-verified.png'),
    cache: {
      eslint: join(screenshots, 'refinement/cache-eslint.png'),
      stylelint: join(screenshots, 'refinement/cache-stylelint.png'),
      markdownlint: join(screenshots, 'refinement/cache-markdownlint.png'),
    },
    coldInstall: {
      eslint: join(screenshots, 'cold-install/eslint.png'),
      stylelint: join(screenshots, 'cold-install/stylelint.png'),
      markdownlint: join(screenshots, 'cold-install/markdownlint.png'),
    },
  },
}
