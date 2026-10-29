<script setup lang="ts">
// 规则能力统一使用图标与文字展示，不要求用户记忆图例。
import type { RuleItem } from '../../../types'

defineProps<{ rule?: Pick<RuleItem, 'fixable' | 'recommended' | 'deprecated'> }>()
</script>

<template>
  <span v-if="rule?.fixable || rule?.recommended || rule?.deprecated" class="rule-meta"><span v-if="rule?.fixable" class="tag green" aria-label="可自动修复"><span class="i-lucide-wrench" aria-hidden="true" /><span>可修复</span></span><span v-if="rule?.recommended" class="tag blue" aria-label="推荐规则"><span class="i-lucide-badge-check" aria-hidden="true" /><span>推荐</span></span><span v-if="rule?.deprecated" class="tag amber" aria-label="已废弃规则"><span class="i-lucide-circle-slash" aria-hidden="true" /><span>废弃</span></span></span>
</template>

<style scoped>
.rule-meta {
display:inline-flex;
flex-wrap:wrap;
gap:4px;
align-items:center;
}

.rule-meta :deep(.tag) {
display:inline-flex;
gap:4px;
align-items:center;
white-space:nowrap;
}

.rule-meta [class*='i-lucide-'] {
flex-shrink:0;
width:12px;
height:12px;
}
</style>
