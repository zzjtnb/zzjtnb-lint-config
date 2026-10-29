/** 真实配置测试需要冷加载语言、antislop 与无障碍插件，保留断言并为首次加载预留时间。 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 单项上限包含真实 ESLint 插件冷启动；不改变 Vitest 的测试发现与默认环境。
    testTimeout: 30_000,
  },
})
