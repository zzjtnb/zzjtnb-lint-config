<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    // 编辑区显示的文件名。
    filename: string
    // 编辑区的无障碍名称。
    label?: string
    // 为 true 时 Ctrl / Cmd + Enter 触发 run 事件。
    runnable?: boolean
  }>(),
  {
    label: '代码编辑器',
    runnable: false,
  },
)
const emit = defineEmits<{ run: [] }>()
const model = defineModel<string>({ required: true })
const editor = ref<HTMLTextAreaElement>()
const scrollTop = ref(0)
const tabIndents = ref(true)
const id = useId()
const lines = computed(() => model.value.split('\n').length)

function onScroll(event: Event) {
  scrollTop.value = (event.target as HTMLTextAreaElement).scrollTop
}

async function indent(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    tabIndents.value = false
    return
  }
  if (event.key !== 'Tab' || event.shiftKey) return
  if (!tabIndents.value) {
    tabIndents.value = true
    return
  }
  event.preventDefault()
  const input = editor.value!
  const start = input.selectionStart
  model.value = `${model.value.slice(0, start)}  ${model.value.slice(input.selectionEnd)}`
  await nextTick()
  input.selectionStart = input.selectionEnd = start + 2
}

/**
 * 将编辑器焦点定位到引擎返回的一基行号。
 * @param line 诊断行号，超出当前文本时定位到最后一行。
 */
function focusLine(line: number) {
  const input = editor.value
  if (!input) return
  const content = model.value.split('\n')
  const index = Math.max(0, Math.min(content.length - 1, line - 1))
  const start = content
    .slice(0, index)
    .reduce((length, item) => length + item.length + 1, 0)
  input.focus()
  input.setSelectionRange(start, start + content[index]!.length)
  const lineHeight
    = Number.parseFloat(getComputedStyle(input).lineHeight) || 24
  input.scrollTop = Math.max(0, index * lineHeight - input.clientHeight / 2)
  scrollTop.value = input.scrollTop
}

defineExpose({ focusLine })
</script>

<template>
  <div class="code-editor">
    <div class="editor-gutter" aria-hidden="true">
      <div :style="{ transform: `translateY(-${scrollTop}px)` }">
        <span v-for="line in lines" :key="line">{{ line }}</span>
      </div>
    </div>
    <label :for="id" class="sr-only">{{ props.label }}</label>
    <textarea
      :id="id"
      ref="editor"
      v-model="model"
      :aria-label="props.label"
      :data-filename="props.filename"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      wrap="off"
      @scroll="onScroll"
      @keydown.exact="indent"
      @keydown.ctrl.enter.exact.prevent="props.runnable && emit('run')"
      @keydown.meta.enter.exact.prevent="props.runnable && emit('run')"
    ></textarea>
  </div>
</template>

<style scoped lang="scss" src="./styles.scss"></style>
