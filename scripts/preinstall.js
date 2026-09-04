import process from 'node:process'
import { parseArgs, styleText } from 'node:util'

import manifest from '../package.json' with { type: 'json' }

// 旧安装入口按要求保留为注释，不再执行：
// "preinstall": "npx only-allow pnpm",
// package.json 保持标准 JSON，实际入口为 node ./scripts/preinstall.js。

function formatReport({ manager, version, reason, stream }) {
  // 将颜色绑定到实际输出流；管道、NO_COLOR 等由 Node.js 原生能力处理。
  const paint = (format, text) => styleText(format, text, { stream })
  const command = text => `    ${paint('cyan', text)}`
  // pnpm 12 在工作区内 self-update 会改写版本声明，因此提示在项目外手动更新。
  // 来源：https://pnpm.io/cli/self-update#behavior
  return [
    '',
    paint([
      'bold',
      reason ? 'red' : 'blue',
    ], reason ? '安装前检查未通过' : '项目安装指引'),
    paint('dim', '────────────────────────────────────'),
    ...(reason
      ? [reason, '']
      : []),
    paint('bold', '项目环境'),
    `  包管理器：${manifest.packageManager}`,
    `  Node.js：${process.versions.node}（要求 ${manifest.engines?.node ?? '未声明'}）`,
    `  ${manager} 版本范围：${manifest.engines?.[manager] ?? '未声明'}`,
    `  当前平台：${process.platform} / ${process.arch}`,
    '',
    paint('bold', '安装与恢复'),
    '  1. 首次安装：按所在平台选择一种方式，不要依次执行所有命令。',
    // 来源：https://pnpm.io/installation（12.x 安装选择器，2026-10-23 核对）。
    // “未标为推荐”不等于官方反对；先列每个平台的 Recommended，再列页面提供的备选。
    '',
    paint('bold', 'macOS / Linux'),
    '  官方推荐：独立安装脚本，安装 pnpm 本身不需要 Node.js。',
    '  curl：',
    command('curl -fsSL https://get.pnpm.io | sh -'),
    '  没有 curl 时，可选择同一安装脚本的 wget 方式：',
    command('wget -qO- https://get.pnpm.io | sh -'),
    '  官方提供的备选：npm 引导器，需要 Node.js 22.13+，仅用于安装 pnpm。',
    command('npx get-pnpm'),
    '',
    paint('bold', 'Windows'),
    '  官方推荐：npm 引导器，需要 Node.js 22.13+。',
    command('npx get-pnpm'),
    '  官方提供的备选：PowerShell 独立安装脚本，安装 pnpm 本身不需要 Node.js。',
    command('irm https://get.pnpm.io/ps1 | iex'),
    '  Windows Defender 有时会拦截独立可执行文件；遇到该情况按官方提示改用上面的 npm 方式。',
    '',
    paint('bold', 'Docker 容器安装（Linux 镜像，替代上面的宿主机安装步骤）'),
    '  官方推荐：独立安装脚本，按镜像已有的 shell 选择一条命令，不要依次执行；写入 Dockerfile 时加 RUN：',
    '  Dockerfile 中先声明安装目录与 PATH，确保后续 RUN 层也能找到 pnpm：',
    // pnpm 12 的独立安装目录使用 PNPM_HOME/bin，而不是旧版的 PNPM_HOME 根目录。
    // 来源：https://pnpm.io/docker；安装脚本：https://get.pnpm.io
    command('ENV PNPM_HOME="/pnpm"'),
    command('ENV PATH="$PNPM_HOME/bin:$PATH"'),
    '  安装用户需对 PNPM_HOME 可写；镜像需提供 wget、which、CA 证书和所选 shell。',
    ...['bash', 'sh', 'dash'].flatMap(shell => [
      `  ${shell}：`,
      command(`wget -qO- https://get.pnpm.io | env ENV="$HOME/.${shell}rc" SHELL="$(which ${shell})" ${shell} -`),
    ]),
    '  官方提供的备选：镜像已包含 Node.js 22.13+ 与 npm 时，可在对应 RUN 层使用 npm 引导器。',
    command('npx get-pnpm'),
    '',
    paint('bold', '预编译二进制（官方提供的其他安装方式）'),
    '  官方安装页同时提供各平台二进制下载：macOS / Windows 按 CPU 架构选择；Linux / Docker 还要匹配 glibc 或 musl。',
    '  手动下载需要自行放入 PATH；不存在适用目标时，按官方页面的支持说明处理，不混用其他架构或 libc 的文件。',
    '',
    paint('bold', '升级与版本确认'),
    `  2. 已有 pnpm v11.10.0 或更新版本：在项目外切换到项目声明的版本 ${version}。`,
    command(`pnpm self-update ${version}`),
    '     请在项目目录外执行，避免同时改写项目的 packageManager。',
    '     更旧或已损坏的 pnpm：使用对应平台上面的安装方式重新安装，再确认版本。',
    '     若由 Homebrew 或 Corepack 管理 pnpm，请按原安装方式更新；不要叠加其他安装方式。',
    '',
    '  3. 确认版本，再回到仓库根目录安装依赖',
    '     安装后打开新终端；若找不到 pnpm，按安装器提示重新加载 shell 配置并检查 PATH。',
    '     独立 pnpm 本身可不依赖 Node.js，但运行本项目仍需满足前面的 Node.js 要求。',
    '     npm / npx 仅用于首次引导，项目依赖仍统一使用 pnpm。',
    command('pnpm --version'),
    command(`${manager} install`),
    '',
    paint('dim', '官方说明：https://pnpm.io/installation'),
    paint('dim', 'Docker 说明：https://pnpm.io/docker'),
    paint('dim', '本脚本不自动下载或升级环境，也不会替你执行安装命令。'),
    '',
  ].join('\n')
}

function main() {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
    },
  })
  const specifier = manifest.packageManager
  const separator = typeof specifier === 'string'
    ? specifier.lastIndexOf('@')
    : -1
  if (separator <= 0 || separator === specifier.length - 1)
    throw new Error('package.json 的 packageManager 必须声明包管理器名称和版本。')

  const manager = specifier.slice(0, separator)
  // Corepack 可在版本后携带完整性摘要；更新命令只使用版本部分。
  const version = specifier.slice(separator + 1).split('+')[0]
  if (values.help) {
    process.stdout.write(formatReport({ manager, version, stream: process.stdout }))
    return 0
  }

  // 只读取管理器与版本标识，不输出完整 user-agent。
  const agent = process.env.npm_config_user_agent
  const identity = /^([a-z][a-z0-9-]*)\/(\d+\.\d+\.\d+(?:[-+][0-9A-Z.+-]+)?)(?:\s|$)/i.exec(agent ?? '')
  if (identity?.[1] === manager)
    return 0

  const reason = !agent
    ? '无法识别包管理器。请通过 pnpm install 启动安装，不要直接运行安装钩子。'
    : identity
      ? `当前使用 ${identity[1]}@${identity[2]}，本项目要求使用 ${manager}。`
      : '包管理器身份信息格式无效，无法确认本次安装使用的工具。'
  process.stderr.write(formatReport({
    manager,
    version,
    reason,
    stream: process.stderr,
  }))
  return 1
}

try {
  process.exitCode = main()
}
catch (error) {
  console.error(`${styleText(['bold', 'red'], '安装前检查失败', { stream: process.stderr })}：${error.message}\n使用 node scripts/preinstall.js --help 查看安装指引。`)
  process.exitCode = 1
}
