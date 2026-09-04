import { defineConfig } from 'tsdown'

export default defineConfig({
  // 只清理本包输出，避免上次构建的失效模块被再次发布。
  clean: true,
  deps: {
    // npm 依赖保留为外部导入，插件身份与版本由消费方依赖图决定，不打包第二份。
    neverBundle: true,
  },
  dts: {
    // 使用 TypeScript 解析导出类型；声明生成不依赖 tsconfig 的 emit 开关。
    resolver: 'tsc',
  },
  // 仅聚合公开工厂与类型；内部实现随入口打包，不自动生成额外子路径导出。
  entry: ['src/index.ts'],
  format: ['esm'],
  // 显式匹配已发布的 exports 契约；.mjs 是 Node 平台的产物约定，不用于普通源码。
  // https://tsdown.dev/options/output-format#output-extensions
  outExtensions: () => ({
    js: '.mjs',
    dts: '.d.ts',
  }),
})
