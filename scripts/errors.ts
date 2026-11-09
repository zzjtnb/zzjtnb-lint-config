/** 将 CLI 捕获的失败转换为可显示文本，保留 Error 的原始消息。 */
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error)
}
