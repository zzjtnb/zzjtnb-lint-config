<script setup lang="ts">
import type { Status } from '../status'
import { statusIcons, statusLabels } from '../status'

defineProps<{
  // 决定徽标颜色与图标的状态；颜色由 data 属性变体选择，图标类名来自 status.ts。
  status: Status
}>()
</script>

<template>
  <!--
    读法：下面的类名分三组。
    1. 排版：inline-flex、items-center、gap-1、px-2、py-1、text-sm、rounded-sm。
    2. 尺寸上限：max-w-(--badge-max-width) 读取 theme.css 里的 CSS 变量，不用写死数值。
    3. 状态颜色：data-[status=success]:bg-success 的意思是“当元素带有 data-status="success" 时，背景用 success 色”。
    状态通过下面的 :data-status 绑定传入，所以颜色切换不需要在脚本里拼接类名。
  -->
  <span
    class="
      inline-flex max-w-(--badge-max-width) items-center gap-1 rounded-sm px-2 py-1 text-sm
      data-[status=success]:bg-success data-[status=success]:text-success-foreground
      data-[status=warning]:bg-warning data-[status=warning]:text-warning-foreground
      data-[status=error]:bg-destructive data-[status=error]:text-destructive-foreground
    "
    :data-status="status"
  >
    <!-- 图标类名来自 status.ts；aria-hidden 表示它只是装饰，读屏软件会跳过。 -->
    <span :class="statusIcons[status]" aria-hidden="true" />
    {{ statusLabels[status] }}
  </span>
</template>
