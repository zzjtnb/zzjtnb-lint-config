<script setup lang="ts">
import { greet } from '../greeting'

defineProps<{
  // 显示在问候语里的名字。
  name: string
}>()
</script>

<template>
  <!--
    读法：这一行类名由 UnoCSS 按需生成。
    flex items-center gap-2 负责横向排列并居中；rounded-lg border border-border 是圆角和边框；
    bg-card text-card-foreground 引用 theme.css 里的主题变量，切换暗色主题时会自动变化。
  -->
  <p class="greeting flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground">
    <!-- i-svg:logo 是 src/assets/icons/logo.svg 提供的本地图标，保留标志原有的品牌蓝色。 -->
    <span class="i-svg:logo" aria-hidden="true" />
    <strong>{{ greet(name) }}</strong>
  </p>
</template>

<!-- scoped 表示样式只作用于当前组件；lang="scss" 表示这里按 SCSS 书写，由 Stylelint 检查。 -->
<style scoped lang="scss">
.greeting {
  /* :deep() 用来穿透 scoped，让样式也影响子元素；Stylelint 的共享配置已允许这种写法。 */
  :deep(strong) {
    font-weight: 600;
  }
}
</style>
