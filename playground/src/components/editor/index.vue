<script setup lang="ts">
import type { editor } from 'modern-monaco/editor-core'
import type { EditorProps } from './types'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { language, loadEditor } from './index'

const props = defineProps<EditorProps>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const host = ref<HTMLElement>()
const error = ref('')
let view: editor.IStandaloneCodeEditor | undefined
function markers(monaco: Awaited<ReturnType<typeof loadEditor>>) {
  if (!view)
    return
  monaco.editor.setModelMarkers(view.getModel()!, 'lint', (props.diagnostics ?? []).filter(item => item.line && item.column).map(item => ({
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
onMounted(async () => {
  try {
    const monaco = await loadEditor()
    if (!host.value)
      return
    view = monaco.editor.create(host.value, {
      value: props.modelValue,
      language: language(props.filename),
      ariaLabel: props.label,
      theme: host.value.closest('.dark')
        ? 'github-dark-default'
        : 'github-light',
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: getComputedStyle(host.value).getPropertyValue('--font-mono'),
      fontSize: 12,
      tabSize: 2,
      scrollBeyondLastLine: false,
      scrollbar: { alwaysConsumeMouseWheel: false },
    })
    markers(monaco)
    view.onDidChangeModelContent(() => emit('update:modelValue', view!.getValue()))
  }
  catch (cause) { error.value = `编辑器加载失败：${String(cause)}` }
})
watch(() => props.modelValue, (value) => {
  if (view && view.getValue() !== value)
    view.setValue(value)
})
watch(() => props.filename, async (filename) => {
  if (view)
    (await loadEditor()).editor.setModelLanguage(view.getModel()!, language(filename))
})
watch(() => props.diagnostics, async () => markers(await loadEditor()))
onUnmounted(() => {
  view?.getModel()?.dispose()
  view?.dispose()
})
defineExpose({
  focus(line = 1, column = 1) {
    if (!view)
      return
    const position = view.getModel()!.validatePosition({ lineNumber: line, column })
    view.setPosition(position)
    view.revealPositionInCenter(position)
    view.focus()
  },
})
</script>

<template>
  <p v-if="error" class="notice error" role="alert">
    {{ error }}
  </p>
  <div ref="host" class="code-editor h-120 border border-slate-200 rounded-lg overflow-hidden" role="group" :aria-label="label" />
</template>
