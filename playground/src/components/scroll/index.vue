<script setup lang="ts">
// 统一可键盘滚动的内容视口与 Reka 滚动条，尺寸由所属面板约束。
defineProps<{ label: string }>()
</script>

<template>
  <ScrollAreaRoot class="scroll-area" type="auto">
    <ScrollAreaViewport class="scroll-viewport" tabindex="0" role="region" :aria-label="label">
      <slot />
    </ScrollAreaViewport><ScrollAreaScrollbar class="scroll-bar" orientation="vertical">
      <ScrollAreaThumb class="scroll-thumb" />
    </ScrollAreaScrollbar><ScrollAreaScrollbar class="scroll-bar" orientation="horizontal">
      <ScrollAreaThumb class="scroll-thumb" />
    </ScrollAreaScrollbar><ScrollAreaCorner />
  </ScrollAreaRoot>
</template>

<style scoped>
.scroll-area {
position:relative;
width:100%;
height:100%;
min-height:0;
overflow:hidden;
}

.scroll-viewport {
width:100%;
height:100%;
}

.scroll-bar {
display:flex;
width:9px;
padding:2px;
touch-action:none;
user-select:none;
}

.scroll-bar[data-orientation='horizontal'] {
height:9px;
}

.scroll-thumb {
position:relative;
flex:1;
background:var(--line);
border-radius:6px;
}

.scroll-bar:hover .scroll-thumb {
background:var(--muted);
}
</style>
