import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import RekaResolver from 'reka-ui/resolver'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { editorWasm } from './scripts/wasm.ts'

export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url))
  // 按启动模式读取工作台自己的环境文件，进程环境变量优先。
  const env = loadEnv(mode, root, 'VITE_')
  const port = env.VITE_PORT
    ? Number(env.VITE_PORT)
    : undefined
  return {
    // 从根目录指定 --config 时，也应读取工作台的 index.html 和源码。
    root,
    // 规则数据由独立 generate 脚本生成，开发和生产均不挂载业务 API 插件。
    plugins: [
      UnoCSS({
        // 显式定位 UnoCSS 配置文件，不随启动命令的工作目录改变。
        configFile: fileURLToPath(new URL('./uno.config.ts', import.meta.url)),
      }),
      vue(),
      vueJsx(),
      vueDevTools(),
      editorWasm(),
      // 只自动导入 Reka 原语，本地组件仍显式表达所属关系。
      Components({
        // 空数组禁用本地组件目录扫描，仅自动导入 Resolver 声明的组件。
        dirs: [],
        // 将自动导入组件的类型写入此生成文件；源码不手写该声明。
        dts: 'src/components.d.ts',
        // 按官方 Resolver 解析 Reka UI 原语，不手写运行时组件导入。
        resolvers: [
          RekaResolver(),
        ],
      }),
    ],
    // 统一控制 Vite 模块解析，供开发与生产构建共同使用。
    resolve: {
      // 将模块路径别名映射为实际源码目录。
      alias: {
        // 将 @ 指向当前工作台 src；TypeScript paths 需与此约定一致。
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // 仅对生产打包生效的输出和分包选项。
    build: {
      // 传入 Vite 8 的 Rolldown 构建选项，不使用旧 Rollup 专用接口。
      rolldownOptions: {
        // 配置构建输出文件及代码分包策略。
        output: {
          // 按实际依赖职责拆分代码，避免实验页提前加载图表资源。
          codeSplitting: {
            // 按匹配规则划分依赖分包；存在多组匹配时使用 priority 决定归属。
            groups: [
              {
                // 运行时辅助代码有多个消费者，不能因共享而把编辑器绑进图表分包。
                name: 'shared-runtime',
                // 用此正则选择要放入当前分包的依赖模块。
                test: /rolldown\/runtime/,
                // 分包匹配优先级，数值越高越先处理；此处只影响当前分组。
                priority: 50,
              },
              {
                // Vue 被所有页面共用，优先独立，避免递归收进图表依赖。
                name: 'vue-vendor',
                // 用此正则选择要放入当前分包的依赖模块。
                test: /node_modules\/(?:vue|@vue\/[^/]+)\//,
                // 分包匹配优先级，数值越高越先处理；此处只影响当前分组。
                priority: 40,
              },
              {
                // 图表依赖仅由图表组件触发下载，不进入代码实验的加载链。
                name: 'chart-renderer',
                // 用此正则选择要放入当前分包的依赖模块。
                test: /node_modules\/(?:zrender|tslib)\//,
                // 分包匹配优先级，数值越高越先处理；此处只影响当前分组。
                priority: 20,
              },
            ],
          },
        },
      },
    },
    // 开发服务选项，仅启动 dev 时生效。
    server: {
      // 监听所有网卡，由 Vite 同时列出本机和可用的网络访问地址。
      host: true,
      // 向服务响应附加跨源隔离头，允许浏览器使用 WebContainer。
      headers: {
        // same-origin 隔离顶层浏览上下文；与 COEP、可信来源共同满足跨源隔离。
        'Cross-Origin-Opener-Policy': 'same-origin',
        // require-corp 限制跨源嵌入资源；配合 COOP 启用 WebContainer 所需隔离。
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // 使用工作台自身环境文件的端口；未配置时遵循 Vite 默认值。
      port,
      // 端口被占用时直接失败，不自动递增到其他端口。
      strictPort: true,
    },
    // 生产预览服务选项，仅启动 preview 时生效。
    preview: {
      // 监听所有网卡而非仅回环地址，便于局域网预览。
      host: true,
      // 向服务响应附加跨源隔离头，允许浏览器使用 WebContainer。
      headers: {
        // same-origin 隔离顶层浏览上下文；与 COEP、可信来源共同满足跨源隔离。
        'Cross-Origin-Opener-Policy': 'same-origin',
        // require-corp 限制跨源嵌入资源；配合 COOP 启用 WebContainer 所需隔离。
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // 与开发服务使用相同环境配置，二者不同时启动。
      port,
      // 端口被占用时直接失败，不自动递增到其他端口。
      strictPort: true,
    },
  }
})
