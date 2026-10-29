<script setup lang="ts">
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{ output: string }>()
const emit = defineEmits<{ clear: [] }>()
const feedback = ref('')
const toastOpen = ref(false)
const host = ref<HTMLElement>()
let terminal: Terminal | undefined
let observer: ResizeObserver | undefined
onMounted(() => {
  terminal = new Terminal({
    fontSize: 12,
    convertEol: true,
    disableStdin: true,
    scrollback: 1000,
    theme: { background: '#101828', foreground: '#e4e7ec' },
  })
  const fit = new FitAddon()
  terminal.loadAddon(fit)
  terminal.open(host.value!)
  terminal.write(props.output)
  observer = new ResizeObserver(() => {
    if (host.value?.clientWidth)
      fit.fit()
  })
  observer.observe(host.value!)
})
watch(() => props.output, (value, previous) => {
  if (value.startsWith(previous)) {
    terminal?.write(value.slice(previous.length))
  }
  else {
    terminal?.reset()
    terminal?.write(value)
  }
})
onUnmounted(() => {
  observer?.disconnect()
  terminal?.dispose()
})
async function copyOutput() {
  try {
    await navigator.clipboard.writeText(props.output)
    feedback.value = '已复制'
  }
  catch {
    feedback.value = '复制失败'
  }
  toastOpen.value = true
}
</script>

<template>
  <section class="console-panel flex flex-col min-h-0 h-full">
    <div class="flex justify-between gap-3 p-3 text-xs">
      <span><span class="i-lucide-terminal" aria-hidden="true" />Console 控制台</span>

      <button class="text-link" :disabled="!output" @click="copyOutput">
        <span class="i-lucide-copy" aria-hidden="true" />复制日志
      </button>
      <button class="text-link" @click="emit('clear')">
        <span class="i-lucide-eraser" aria-hidden="true" />清空日志
      </button>
    </div>
    <div ref="host" class="flex-1 min-h-36 bg-[#101828] p-2" role="region" aria-label="控制台输出" />
    <ToastRoot v-model:open="toastOpen" class="ui-toast">
      <ToastDescription>{{ feedback }}</ToastDescription><ToastClose class="btn" aria-label="关闭日志通知">
        关闭
      </ToastClose>
    </ToastRoot>
  </section>
</template>
