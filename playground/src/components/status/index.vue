<script setup lang="ts">
// 顶部与状态详情共用阶段语义，不从进度文案猜测执行结果。
import type { RuntimeState } from '../../sandbox/client'

defineProps<{ state: RuntimeState, compact?: boolean }>()
const icons = {
  idle: 'i-lucide-circle-dashed',
  preparing: 'i-lucide-loader-circle',
  installed: 'i-lucide-package-check',
  ready: 'i-lucide-circle-check',
  running: 'i-lucide-loader-circle',
  cancelled: 'i-lucide-circle-pause',
  error: 'i-lucide-circle-x',
}
</script>

<template>
  <span class="runtime-status" :class="[state.phase, { compact }]" :data-phase="state.phase" :aria-busy="state.phase === 'preparing' || state.phase === 'running'">
    <span class="status-icon" :class="icons[state.phase]" aria-hidden="true" /><span class="status-message">{{ state.message }}</span>
  </span>
</template>

<style scoped>
.runtime-status {
display:inline-flex;
gap:7px;
align-items:center;
min-width:0;
color:var(--muted);
}

.status-icon {
flex-shrink:0;
width:14px;
height:14px;
}

.preparing,.cancelled {
color:var(--warning);
}

.installed,.running {
color:var(--accent);
}

.ready {
color:var(--success);
}

.error {
color:var(--danger);
}

.preparing .status-icon,.running .status-icon {
animation:status-spin 1s linear infinite;
}

.compact .status-message {
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap;
}

@keyframes status-spin {
to {
transform:rotate(360deg);
} }

@media(prefers-reduced-motion:reduce) { .status-icon {
animation:none !important;
} }
</style>
