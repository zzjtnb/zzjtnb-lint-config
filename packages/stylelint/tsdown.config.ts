/** 构建公开配置入口，并通过项目的原生编译器生成类型声明。 */
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 控制依赖是否进入构建产物，避免发布包重复打包插件与解析器。
  deps: {
    // 保留 presets、语法解析器与插件的外部导入，不把消费方需要解析的依赖内联。
    neverBundle: true,
  },
  // 配置公开类型声明生成；只在构建声明时生效。
  dts: {
    // 使用项目声明的 TypeScript 7 原生编译器生成类型声明。
    generator: 'tsgo',
  },
  // 只发布公开配置工厂及类型；具体 presets 仍由 dependencies 提供。
  entry: ['src/index.ts'],
  // 按构建产物自动维护 package.json 的公开导出入口。
  exports: true,
})
