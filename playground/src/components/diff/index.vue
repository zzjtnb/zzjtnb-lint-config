<script setup lang="ts">
import type { editor } from 'modern-monaco/editor-core'
import type { DiffProps } from './types'
import { onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { language, loadEditor } from '../editor/index'

const props = defineProps<DiffProps>()
const emit = defineEmits<{ 'update:original': [value: string] }>()
const host = ref<HTMLElement>()
const error = ref('')
const ready = ref(false)
let view: editor.IStandaloneDiffEditor | undefined
async function markers() {
  if (!view)
    return
  const monaco = await loadEditor()
  const models = view.getModel()!
  for (const model of [models.original, models.modified]) monaco.editor.setModelMarkers(model, 'lint', [])
  monaco.editor.setModelMarkers(props.modifiedDiagnostics ? models.modified : models.original, 'lint', (props.diagnostics ?? []).filter(item => item.line && item.column).map(item => ({
    message: item.message,
    code: item.rule,
    severity: item.severity === 'error'
      ? monaco.MarkerSeverity.Error
      : monaco.MarkerSeverity.Warning,
    startLineNumber: item.line!,
    startColumn: item.column!,
    endLineNumber: item.endLine ?? item.line!,
    endColumn: item.endColumn ?? item.column! + 1,
  })))
}
async function initialize() {
  try {
    const monaco = await loadEditor()
    if (!host.value)
      return
    if (view) {
      view.layout()
      return
    }
    view = monaco.editor.createDiffEditor(host.value, {
      automaticLayout: true,
      readOnly: true,
      originalEditable: props.editable === true,
      theme: host.value.closest('.dark')
        ? 'github-dark-default'
        : 'github-light',
      minimap: { enabled: false },
      fontSize: 12,
      scrollBeyondLastLine: false,
      renderSideBySide: props.kind !== 'config',
      useInlineViewWhenSpaceIsLimited: false,
      scrollbar: { alwaysConsumeMouseWheel: false },
    })
    view.setModel({
      original: monaco.editor.createModel(props.original, language(props.filename)),
      modified: monaco.editor.createModel(props.modified, language(props.filename)),
    })
    view.getOriginalEditor().updateOptions({
      ariaLabel: props.kind === 'config'
        ? '默认配置'
        : props.editable ? '示例代码' : '原始配置',
    })
    view.getModifiedEditor().updateOptions({
      ariaLabel: props.kind === 'config'
        ? '当前配置'
        : '修复结果',
    })
    view.getModel()!.original.onDidChangeContent(() => {
      if (props.editable)
        emit('update:original', view!.getModel()!.original.getValue())
    })
    ready.value = true
    await markers()
  }
  catch (cause) { error.value = `修复对比加载失败：${String(cause)}` }
}
onMounted(initialize)
onActivated(initialize)
watch(() => props.filename, async (filename) => {
  const monaco = await loadEditor()
  const models = view?.getModel()
  if (!models)
    return
  monaco.editor.setModelLanguage(models.original, language(filename))
  monaco.editor.setModelLanguage(models.modified, language(filename))
})
watch(() => props.original, (value) => {
  const model = view?.getModel()?.original
  if (model && model.getValue() !== value)
    model.setValue(value)
})
watch(() => props.modified, (value) => {
  const model = view?.getModel()?.modified
  if (model && model.getValue() !== value)
    model.setValue(value)
})
watch(() => [props.diagnostics, props.modifiedDiagnostics], markers)
onUnmounted(() => {
  const model = view?.getModel()
  view?.dispose()
  model?.original.dispose()
  model?.modified.dispose()
})
defineExpose({
  focusOriginal(line = 1, column = 1) {
    const original = view?.getOriginalEditor()
    if (!original)
      return
    const position = original.getModel()!.validatePosition({ lineNumber: line, column })
    original.setPosition(position)
    original.revealPositionInCenter(position)
    original.focus()
  },
  focusModified(line = 1, column = 1) {
    const modified = view?.getModifiedEditor()
    if (!modified)
      return
    const position = modified.getModel()!.validatePosition({ lineNumber: line, column })
    modified.setPosition(position)
    modified.revealPositionInCenter(position)
    modified.focus()
  },
})
</script>

<template>
  <section class="diff-view flex flex-col min-h-0 h-full">
    <div class="grid gap-3 p-2 text-xs" :class="kind === 'config' ? 'grid-cols-1' : 'grid-cols-2'" style="color: var(--muted)">
      <span>{{ kind === 'config' ? '默认配置 → 当前配置 · 内联对比' : editable ? '示例代码 · 可编辑' : '原始内容 · 只读' }}</span><span v-if="kind !== 'config'">修复结果 · 只读预览</span>
    </div>
    <p v-if="error" class="notice error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="!ready" class="notice" role="status">
      <span class="i-lucide-loader-circle animate-spin" aria-hidden="true" />正在加载代码编辑器…
    </p>
    <div ref="host" class="diff-editor flex-1 min-h-80 border overflow-hidden" />
  </section>
</template>
