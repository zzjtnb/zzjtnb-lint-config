/** 构建公开配置入口，并通过项目的原生编译器生成类型声明。 */
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 配置公开类型声明生成；只在构建声明时生效。
  dts: {
    // 使用项目声明的 TypeScript 7 原生编译器生成类型声明。
    generator: 'tsgo',
  },
  // 只编译 CLI2 扫描入口；规则 JSONC 原样发布，不复制规则值。
  entry: ['src/index.ts'],
  // 按构建产物自动维护 package.json 的公开导出入口。
  exports: {
    // 自动生成 CLI2 执行入口，同时保留根 JSONC 规则入口的既有消费契约。
    customExports(exports) {
      // 单一代码入口被 tsdown 视为根导出，转挂到 CLI2 子路径，根路径继续提供 JSONC。
      return { ...exports, './config': exports['.'], '.': './index.jsonc' }
    },
  },
})
