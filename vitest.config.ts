import { fileURLToPath } from 'node:url'

import Vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

const testFiles = '**/*.{test,spec}.?(c|m)[jt]s?(x)'

export default defineConfig({
  // 以配置文件所在目录定位项目，避免测试子目录和编辑器的 CWD 改变测试范围。
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    // 默认使用 Node.js；Vue 状态和组件测试按文件声明启用 happy-dom。
    environment: 'node',
    exclude: [
      ...configDefaults.exclude,
      '**/dist/**',
      '**/.tmp/**',
      '**/fixtures/**',
    ],
    projects: [
      {
        plugins: [
          Vue(),
        ],
        test: {
          name: 'unit',
          // 包内测试归各自根级 tests/，跨包测试归仓库根级 tests/。
          include: [`{apps,docs,internal,packages,playground}/**/tests/${testFiles}`, `scripts/**/tests/${testFiles}`, `tests/unit/${testFiles}`],
        },
      },
      {
        test: {
          name: 'integration',
          include: [`tests/integration/${testFiles}`],
          // 包入口测试单独运行，避免同一文件被两个项目重复执行。
          exclude: ['tests/integration/package-loading.test.ts'],
        },
      },
      {
        test: {
          name: 'packages',
          // 保留包名解析，验证现有构建产物；不能以源码别名替代发布入口。
          include: ['tests/integration/package-loading.test.ts'],
        },
      },
    ],
  },
})
