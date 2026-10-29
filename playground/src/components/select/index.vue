<script setup lang="ts">
// 统一选择控件的弹层与键盘语义，避免系统下拉菜单在不同浏览器中呈现不同外观。

defineOptions({ inheritAttrs: false })
defineProps<{ options: ReadonlyArray<{ value: string, label: string }>, disabled?: boolean }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger v-bind="$attrs" class="select-trigger" :data-value="model">
      <SelectValue /><SelectIcon class="i-lucide-chevron-down" aria-hidden="true" />
    </SelectTrigger>
    <SelectPortal to=".workbench">
      <SelectContent class="select-content" position="popper" :side-offset="5" :collision-padding="10">
        <SelectViewport>
          <SelectItem v-for="item in options" :key="item.value" :value="item.value" :data-value="item.value" class="select-item">
            <SelectItemText>{{ item.label }}</SelectItemText><SelectItemIndicator class="i-lucide-check" aria-hidden="true" />
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style>
.workbench .select-trigger {
display:inline-flex;
gap:10px;
align-items:center;
justify-content:space-between;
min-width:110px;
max-width:100%;
padding:6px 9px;
font-size:12px;
color:var(--text);
cursor:pointer;
background:var(--surface);
border:1px solid var(--line);
border-radius:6px;
}

.workbench .select-trigger:disabled {
cursor:not-allowed;
}

.workbench .select-content {
z-index:80;
width:var(--reka-select-trigger-width);
min-width:160px;
max-height:min(320px,var(--reka-select-content-available-height));
padding:5px;
overflow:auto;
font-size:12px;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
box-shadow:0 8px 30px rgb(0 0 0 / 14%);
}

.workbench .select-item {
display:flex;
gap:12px;
align-items:center;
justify-content:space-between;
padding:8px 9px;
cursor:pointer;
outline:none;
border-radius:4px;
}

.workbench .select-item[data-highlighted] {
color:var(--accent);
background:var(--brand-soft);
}

.workbench .select-item[data-state='checked'] {
font-weight:600;
color:var(--accent);
}
</style>
