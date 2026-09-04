import { defineConfig } from 'tsdown'

export default defineConfig({
  // 只清理本包输出，避免上次构建的失效模块被再次发布。
  clean: true,
  deps: {
    // 保留 presets、语法解析器与插件的外部导入，不把消费方需要解析的依赖内联。
    neverBundle: true,
  },
  dts: {
    // 使用 TypeScript 解析原生 Stylelint Config 类型，声明输出由 tsdown 统一管理。
    resolver: 'tsc',
  },
  // 只发布公开配置工厂及类型；具体 presets 仍由 dependencies 提供。
  entry: ['src/index.ts'],
  format: ['esm'],
  // 与 package.json 的 import / types 入口一致，保留既有发布契约。
  // https://tsdown.dev/options/output-format#output-extensions
  outExtensions: () => ({
    js: '.mjs',
    dts: '.d.ts',
  }),
})
