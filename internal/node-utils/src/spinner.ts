import type { Ora } from 'ora'

import ora from 'ora'

interface SpinnerOptions {
  // 操作失败时的提示，未提供时使用默认失败文案。
  failedText?: string
  // 操作成功时的提示，未提供时使用默认成功文案。
  successText?: string
  // 执行期间的进度标题。
  title: string
}

/**
 * 为异步操作显示进度反馈，并在成功、失败后释放本次指示器。
 * @param options 进度标题及可选的完成提示。
 * @param options.failedText 操作失败时的提示；未提供时使用默认失败文案。
 * @param options.successText 操作成功时的提示；未提供时使用默认成功文案。
 * @param options.title 执行期间显示的进度标题。
 * @param callback 要执行一次的异步操作；此函数不自动重试。
 * @returns 回调的原始结果；失败时显示提示并重新抛出原始错误。
 */
export async function spinner<T>(
  { failedText, successText, title }: SpinnerOptions,
  callback: () => Promise<T>,
): Promise<T> {
  const loading: Ora = ora(title).start()

  try {
    const result = await callback()
    loading.succeed(successText || 'Success!')
    return result
  }
  catch (error) {
    loading.fail(failedText || 'Failed!')
    throw error
  }
  finally {
    loading.stop()
  }
}
