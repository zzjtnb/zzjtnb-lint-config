import { posix } from 'node:path'

/**
 * 将给定的文件路径转换为 POSIX 风格。
 * @param pathname 原始文件路径，不解析相对路径或折叠路径片段。
 * @returns 将反斜杠替换为正斜杠后的字符串。
 */
function toPosixPath(pathname: string) {
  return pathname.split(`\\`).join(posix.sep)
}

export { toPosixPath }
