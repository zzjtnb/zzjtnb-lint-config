<script setup lang="ts">
// 按页面懒加载的 SVG 图表，复用工作台主题并转发数据点选择，不持有业务数据副本。
import type { ECElementEvent, EChartsOption } from 'echarts'
import { AriaComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps<{ type: 'pie' | 'bar', option: EChartsOption, label: string, dark: boolean }>()
const emit = defineEmits<{ select: [event: ECElementEvent] }>()
// 仅注册当前界面使用的图形与组件，图表随页面按需加载。
use([
  AriaComponent,
  LegendComponent,
  TooltipComponent,
  SVGRenderer,
])
const ready = ref(false)
const error = ref('')
watch(() => props.type, async (type) => {
  ready.value = false
  error.value = ''
  try {
    // 独立的 import 调用使 Vite 分别预加载依赖，避免合并条件分支后连带下载柱状图。
    if (type === 'pie') {
      const chart = await import('./pie')
      chart.register()
    }
    else {
      const chart = await import('./bar')
      chart.register()
    }
    ready.value = true
  }
  catch (cause) { error.value = `图表加载失败：${String(cause)}` }
}, { immediate: true })
// 固定渲染器和中文界面；数据变化只更新 option，不重复创建图表实例。
const initOptions = { renderer: 'svg' as const, locale: 'ZH' }
const option = computed<EChartsOption>(() => ({
  backgroundColor: 'transparent',
  color: [
    props.dark ? '#8cbcff' : '#175cd3',
    '#8b6bc5',
    '#2c9387',
    '#b88732',
    '#8a94a5',
  ],
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    color: props.dark ? '#c9d1de' : '#3c3c43',
  },
  animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  animationDuration: 250,
  aria: { enabled: true },
  tooltip: {
    confine: true,
    backgroundColor: props.dark ? '#1d2939' : '#fff',
    borderColor: props.dark ? '#2b394d' : '#dce4f0',
    textStyle: {
      color: props.dark ? '#c9d1de' : '#3c3c43',
    },
  },
  ...props.option,
}))
function select(event: ECElementEvent) {
  if (event.componentType === 'series' && event.name)
    emit('select', event)
}
</script>

<template>
  <figure class="data-chart" :aria-label="label">
    <p v-if="error" role="alert">
      {{ error }}
    </p>
    <VChart v-else-if="ready" :option="option" :theme="props.dark ? 'dark' : undefined" :init-options="initOptions" autoresize @click="select" />
  </figure>
</template>

<style scoped>
.data-chart {
width:100%;
min-width:0;
height:280px;
margin:0;
}
</style>
