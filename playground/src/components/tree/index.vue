<script setup lang="ts">
// 从当前工具工作区路径派生目录，不复制文件内容或引擎状态。
import { computed, ref, watch } from 'vue'

const props = defineProps<{ paths: string[], selected?: string, rootLabel: string }>()
const emit = defineEmits<{ select: [path: string] }>()
interface Node { path: string, name: string, children?: Node[] }
const expanded = ref<string[]>(['/'])
watch(() => props.selected, (path) => {
  if (!path)
    return
  expanded.value = [
    ...new Set([
      ...expanded.value,
      '/',
      ...path.split('/').slice(0, -1).map((_, index) => path.split('/').slice(0, index + 1).join('/')),
    ]),
  ]
}, { immediate: true })
defineExpose({
  expandAll: () => {
    expanded.value = [
      '/',
      ...new Set(props.paths.flatMap(path => path.split('/').slice(0, -1).map((_, index) => path.split('/').slice(0, index + 1).join('/')))),
    ]
  },
  collapseAll: () => { expanded.value = [] },
})
const items = computed(() => {
  const roots: Node[] = []
  for (const path of props.paths) {
    let nodes = roots
    const parts = path.split('/')
    for (let index = 0; index < parts.length; index++) {
      const key = parts.slice(0, index + 1).join('/')
      let node = nodes.find(item => item.path === key)
      if (!node) {
        node = {
          path: key,
          name: parts[index]!,
          ...(index < parts.length - 1
            ? { children: [] }
            : {}),
        }
        nodes.push(node)
      }
      if (node.children)
        nodes = node.children
    }
  }
  const directories = [roots]
  while (directories.length) {
    const entries = directories.pop()!
    entries.sort((a, b) => Number(!!b.children) - Number(!!a.children) || a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.children)
        directories.push(entry.children)
    }
  }
  return roots.length
    ? [
        { path: '/', name: props.rootLabel, children: roots },
      ]
    : []
})
</script>

<template>
  <TreeRoot v-slot="{ flattenItems }" v-model:expanded="expanded" :items="items" :model-value="selected ? { path: selected, name: selected.split('/').pop()! } : undefined" :get-key="(item: Node) => item.path" aria-label="工作区目录树" class="file-tree">
    <TreeItem v-for="item in flattenItems" :key="item._id" v-slot="{ isExpanded }" v-bind="item.bind" :data-file-path="item.hasChildren ? undefined : item.value.path" :style="{ paddingLeft: `${(item.level - 1) * 18 + 10}px` }" @select="!item.hasChildren && emit('select', item.value.path)">
      <span v-if="item.hasChildren" class="i-lucide-chevron-right tree-chevron" :class="{ expanded: isExpanded }" aria-hidden="true" /><span v-else class="tree-chevron" />
      <span :class="item.hasChildren ? isExpanded ? 'i-lucide-folder-open' : 'i-lucide-folder' : 'i-lucide-file-code-2'" aria-hidden="true" /><span class="tree-name">{{ item.value.name }}</span><slot v-if="!item.hasChildren" name="suffix" :path="item.value.path" />
    </TreeItem>
  </TreeRoot>
</template>
