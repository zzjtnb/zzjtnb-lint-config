<script setup lang="ts">
// 为说明图标和只读数值提供统一的鼠标及键盘提示。
defineOptions({ inheritAttrs: false })
defineProps<{ text: string }>()
</script>

<template>
  <TooltipRoot>
    <TooltipTrigger as-child>
      <span v-bind="$attrs" tabindex="0"><slot /></span>
    </TooltipTrigger><TooltipPortal to=".workbench">
      <TooltipContent class="ui-tooltip" :side-offset="6">
        {{ text }}
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
