/** 构建公开配置入口，并生成公开类型声明。 */
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 控制依赖是否进入构建产物，避免发布包重复打包插件与解析器。
  deps: {
    // npm 依赖保留为外部导入，插件身份与版本由消费方依赖图决定，不打包第二份。
    neverBundle: true,
  },
  // 配置公开类型声明生成；只在构建声明时生效。
  dts: {
    // 上游 typescript-eslint 仍需 TS6，声明复用同一编译器，不另装原生预览版。
    generator: 'tsc',
  },
  // 仅聚合公开工厂与类型；内部实现随入口打包，不自动生成额外子路径导出。
  entry: ['src/index.ts'],
  // 按构建产物自动维护 package.json 的公开导出入口。
  exports: true,
})
