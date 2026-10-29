/** 仅供端口清理脚本使用的默认清理目标，不作为应用服务配置。 */
export const ports = {
  // 默认清理文档站开发端口。
  docs: 3000,
  // Playground 工作台；三个公开配置包本身不监听本机端口。
  playground: 3001,
} as const
