import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// 与 Vite 开发服务读取同一工作台环境；CI 预览使用 production 模式。
const env = loadEnv(process.env.CI ? 'production' : 'development', fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${env.VITE_PORT || (process.env.CI ? 4173 : 5173)}`

/**
 * 从文件读取环境变量。
 * https://github.com/motdotla/dotenv
 */
// 官方模板可用 dotenv 的 config 方法加载环境变量；本项目已在上方使用 Vite loadEnv，无需重复加载。

/**
 * 配置说明见 https://playwright.dev/docs/test-configuration。
 */
export default defineConfig({
  // 从 e2e 目录发现 Playwright 浏览器测试，不包含单元测试目录。
  testDir: './e2e',
  /* 单个测试的最长运行时间；真实引擎首次准备允许较长等待。 */
  timeout: 300 * 1000,
  // 统一配置 Playwright 断言等待时间，不替代单个测试的总超时。
  expect: {
    /**
     * 断言等待条件成立的最长时间。
     * 例如 `await expect(locator).toHaveText();`。
     */
    timeout: 5000,
  },
  /* CI 中发现遗留 test.only 时使任务失败。 */
  forbidOnly: !!process.env.CI,
  /* 仅在 CI 中重试失败测试。 */
  retries: process.env.CI ? 2 : 0,
  /* CI 中使用单个工作进程；也可通过 CLI 调整并发。 */
  workers: process.env.CI ? 1 : undefined,
  /* 报告器说明见 https://playwright.dev/docs/test-reporters。 */
  reporter: 'html',
  /* 以下设置供所有浏览器项目共用，接口见 https://playwright.dev/docs/api/class-testoptions。 */
  use: {
    /* click 等单个操作的最长时间；0 表示不限制。 */
    actionTimeout: 0,
    /* 用于 `await page.goto('/')` 等操作的基础地址。 */
    baseURL,
    // 固定浏览器初始视口尺寸，单个用例仍可覆盖窄屏场景。
    viewport: {
      // 测试浏览器视口宽度，单位为 CSS 像素。
      width: 1600,
      // 测试浏览器视口高度，单位为 CSS 像素。
      height: 1100,
    },
    // 传给浏览器启动器的选项，与页面交互选项分开维护。
    launchOptions: {
      // 可通过环境变量选择已安装的浏览器；未设置时使用 Playwright 管理的版本。
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
    },

    /* 首次重试时收集追踪，说明见 https://playwright.dev/docs/trace-viewer。 */
    trace: 'on-first-retry',

    /* CI 使用无头模式，本地默认显示浏览器。 */
    headless: !!process.env.CI,
  },

  /* 配置主要浏览器项目。 */
  projects: [
    {
      // 浏览器项目标识，供 --project 筛选测试，不代表已安装该浏览器。
      name: 'chromium',
      // 当前浏览器项目的设备与上下文选项，覆盖顶层 use 的同名项。
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // 浏览器项目标识，供 --project 筛选测试，不代表已安装该浏览器。
      name: 'firefox',
      // 当前浏览器项目的设备与上下文选项，覆盖顶层 use 的同名项。
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      // 浏览器项目标识，供 --project 筛选测试，不代表已安装该浏览器。
      name: 'webkit',
      // 当前浏览器项目的设备与上下文选项，覆盖顶层 use 的同名项。
      use: {
        ...devices['Desktop Safari'],
      },
    },

    /* 移动端视口测试示例。 */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },

    /* 已安装的品牌浏览器测试示例。 */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   },
    // },
  ],

  /* 截图、视频和追踪等测试产物目录。 */
  outputDir: '../.tmp/playground/e2e-results',

  /* 测试开始前启动本地服务。 */
  webServer: {
    /**
     * 本地默认使用开发服务，以加快反馈。
     * CI 使用构建后的预览服务。
     * 本地已有服务时复用，不重复启动。
     */
    command: process.env.CI ? 'pnpm run preview' : 'pnpm run dev',
    // 等待此地址就绪；未设置环境变量时使用配置中给出的本地地址。
    url: baseURL,
    // 本地复用已启动服务，CI 禁止复用以验证本次产物。
    reuseExistingServer: !process.env.CI,
  },
})
