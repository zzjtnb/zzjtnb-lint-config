/** 与 Stylelint 演示使用同一 Monaco 加载器，编辑器和差异视图共用语言与主题。 */
import type { init } from 'modern-monaco/core'

let loading: ReturnType<typeof init> | undefined
/** 按需加载唯一编辑器运行时；诊断仅由工作台实际 Linter 提供。 */
export function loadEditor() {
  loading ??= import('modern-monaco/core').then(({ init }) => {
    // 保留原入口启用的内置语言服务；语法由 core 在模型实际使用时按语言加载。
    Object.assign(globalThis, {
      MonacoEnvironment: { ...globalThis.MonacoEnvironment, useBuiltinLSP: true },
    })
    return init({
      themes: ['github-light', 'github-dark-default'],
      lsp: {
        css: {
          diagnosticsOptions: { validate: false },
        },
        typescript: {
          diagnosticsOptions: { validate: false },
        },
        html: {
          diagnosticsOptions: { validate: false },
        },
        json: {
          diagnosticsOptions: { validate: false },
        },
      },
    })
  })
  return loading
}

/** 按虚拟文件扩展名选择 Monaco 的语言模式。 */
export function language(filename: string) {
  const extension = filename.split('.').pop()!
  if (/^[cm]?tsx?$/.test(extension))
    return 'typescript'
  if (/^[cm]?jsx?$/.test(extension))
    return 'javascript'
  return ({
    md: 'markdown',
    yml: 'yaml',
    jsonc: 'json',
    json5: 'json',
  } as Record<string, string>)[extension] ?? extension
}

/** 仅更新已经加载的编辑器，页面切换主题不触发额外下载。 */
export function setEditorTheme(dark: boolean) {
  void loading?.then(monaco => monaco.editor.setTheme(dark ? 'github-dark-default' : 'github-light'))
}
