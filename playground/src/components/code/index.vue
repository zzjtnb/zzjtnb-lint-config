<script setup lang="ts">
// 只读代码的高亮与滚动视口；编辑操作仍由 Monaco 负责。
import { ref, watch } from 'vue'
import Scroll from '../scroll/index.vue'

const props = withDefaults(defineProps<{ code: string, language?: 'json' | 'javascript', label?: string }>(), { language: 'json', label: '代码片段' })
const html = ref('')
watch([
  () => props.code,
  () => props.language,
], async () => {
  html.value = ''
  const { highlight } = await import('./highlight')
  html.value = await highlight(props.code, props.language)
}, { immediate: true })
</script>

<template>
  <Scroll class="code-block" :label="label" :style="{ height: `${Math.min(code.split('\n').length * 20 + 24, 380)}px` }">
    <div v-if="html" class="highlighted-code" v-html="html" /><pre v-else>{{ code }}</pre>
  </Scroll>
</template>

<style>
.workbench .code-block {
min-width:0;
max-width:100%;
background:var(--well);
border-radius:6px;
}

.workbench .code-block pre {
padding:12px;
margin:0;
font:12px/20px var(--font-mono);
white-space:pre;
background:none;
border:0;
border-radius:0;
}

.workbench .code-block .shiki,.workbench .code-block .shiki span {
color:var(--shiki-light);
}

.workbench.dark .code-block .shiki,.workbench.dark .code-block .shiki span {
color:var(--shiki-dark);
}
</style>
