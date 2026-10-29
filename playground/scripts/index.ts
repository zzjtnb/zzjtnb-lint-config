// 动态导入的生成入口也明确声明为模块，以检查顶层 await。
export {}
// 先生成浏览元数据，再准备浏览器检查服务文件。
await import('./metadata')
await import('./runtime')
