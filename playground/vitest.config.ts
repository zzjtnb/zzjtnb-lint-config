import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// 这些测试运行 Node 生成器或真实检查引擎，不依赖浏览器 DOM。
const nodeTests = [
  'src/__tests__/inspect.test.ts',
  'src/__tests__/sandbox/metadata.test.ts',
  'src/__tests__/sandbox/manifest.test.ts',
  'src/__tests__/sandbox/imports.test.ts',
  'src/__tests__/sandbox/wasm.test.ts',
]

export default defineConfig(env => mergeConfig(
  viteConfig(env),
  defineConfig({
    // 单元测试运行选项，由 Vitest 读取，不改变生产构建。
    test: {
      // 各项目继承当前 Vite 插件；按测试职责选择运行环境，不逐文件使用环境注释。
      projects: [
        {
          extends: true,
          test: {
            // 生成器与引擎测试在 Node 中执行，不初始化无用的 DOM。
            name: 'node',
            environment: 'node',
            include: nodeTests,
            // 包含真实插件冷启动；这是契约测试超时，不是引擎性能指标。
            testTimeout: 30000,
          },
        },
        {
          extends: true,
          test: {
            // 页面与 Store 测试继续使用脚手架已有的 jsdom。
            name: 'browser',
            environment: 'jsdom',
            exclude: [
              ...configDefaults.exclude,
              'e2e/**',
              ...nodeTests,
            ],
          },
        },
      ],
      // 继承 Vitest 默认排除项，并排除由 Playwright 管理的 e2e 文件。
      exclude: [...configDefaults.exclude, 'e2e/**'],
      // 从工作台目录解析测试文件与相对路径，不从仓库根误发现其他测试。
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
))
