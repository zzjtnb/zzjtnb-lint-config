import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

import { playgroundApi } from './plugins/api.ts'

export default defineConfig({
  // 从根目录指定 --config 时，也应读取工作台的 index.html 和源码。
  root: fileURLToPath(new URL('.', import.meta.url)),
  // 本地 Node.js API 只在开发服务挂载；build / preview 仅提供静态页面。
  plugins: [
    vue(),
    playgroundApi(),
  ],
  server: {
    // 监听所有网卡，由 Vite 同时列出本机和可用的网络访问地址。
    host: true,
    // Playground 统一占用 3001（开发与预览不同时运行）
    port: 3001,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 3001,
    strictPort: true,
  },
})
