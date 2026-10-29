/** @type {import('markdownlint-cli2/markdownlint').Rule} */
export default {
  names: ['project-no-todo'],
  description: '文档不允许保留 TODO 标记',
  tags: ['project'],
  parser: 'none',
  /**
   * 检查原始文本中的待办标记，包括代码块。
   * @param params Markdownlint 提供的输入行和规则选项。
   * @param onError 接收一基行号及错误范围的报告函数。
   */
  function(params, onError) {
    params.lines.forEach((line, index) => {
      const column = line.indexOf('TODO:')
      if (column !== -1) {
        onError({
          lineNumber: index + 1,
          detail: '请完成或移除 TODO 标记',
          range: [column + 1, 5],
        })
      }
    })
  },
}
