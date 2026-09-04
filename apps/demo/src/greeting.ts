// 问候语模块：提供一个固定前缀和一个拼接问候的函数。
// 它是最简单的 TypeScript 模块，用来演示 ESLint 对普通脚本的检查；Greeting.vue 会引用 greet。

// 每句问候的固定前缀。
export const greetingPrefix = 'zzjtnb lint config demo'

// 给名字拼上固定前缀，返回一句问候，例如 greet('小明') 得到 "zzjtnb lint config demo: 小明"。
export function greet(name: string): string {
  return `${greetingPrefix}: ${name}`
}
