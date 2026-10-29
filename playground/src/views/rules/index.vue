<script setup lang="ts">
import type { RuleItem } from '../../../types'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Hint from '../../components/hint/index.vue'
import RuleMeta from '../../components/rule/Meta.vue'
import Scroll from '../../components/scroll/index.vue'
import { useConfigStore, useExperimentStore } from '../../stores/index'
import Detail from './components/Detail.vue'

const route = useRoute()
const contextRule = ref('')
function showRuleMenu(event: MouseEvent) {
  const name = (event.target as HTMLElement).closest<HTMLElement>('[data-rule-name]')?.dataset.ruleName
  if (name) {
    contextRule.value = name
    return
  }
  event.preventDefault()
  event.stopPropagation()
}
const config = useConfigStore()
const experiment = useExperimentStore()
const query = ref(typeof route.query.rule === 'string'
  ? route.query.rule
  : '')
const plugin = ref(typeof route.query.plugin === 'string'
  ? route.query.plugin
  : 'all')
const usage = ref('all')
const attribute = ref('all')
watch(() => route.query.plugin, (value) => {
  plugin.value = typeof value === 'string'
    ? value
    : 'all'
  if (typeof value === 'string') {
    query.value = ''
    usage.value = 'all'
    attribute.value = 'all'
  }
})
watch(() => route.query.rule, (value) => {
  if (typeof value === 'string') {
    query.value = value
    config.selectedRule = value
    usage.value = 'all'
    plugin.value = 'all'
    attribute.value = 'all'
  }
})
const grid = ref(false)
watch(() => config.mode, () => {
  query.value = ''
  plugin.value = 'all'
  usage.value = 'all'
  attribute.value = 'all'
  if (typeof route.query.rule === 'string') {
    query.value = route.query.rule
    config.selectedRule = route.query.rule
    usage.value = 'all'
  }
  else if (typeof route.query.plugin === 'string') {
    plugin.value = route.query.plugin
    usage.value = 'all'
  }
})
const page = ref(1)
const pluginCounts = computed(() => config.rules.reduce((counts, rule) => {
  counts[rule.category] = (counts[rule.category] ?? 0) + 1
  return counts
}, {} as Record<string, number>))
const plugins = computed(() => Object.keys(pluginCounts.value).sort())
const search = computed(() => query.value.trim().toLowerCase())
function declaredLevels(rule: RuleItem) {
  return [
    ...new Set(rule.sources.map((source) => {
      const value = JSON.parse(source.value)
      const level = Array.isArray(value)
        ? value[0]
        : value
      return level === 0 || level === false || level === null || level === 'off'
        ? 'off'
        : level === 1 || level === 'warn'
          ? 'warn'
          : 'error'
    })),
  ]
}
const filtered = computed(() => config.rules.filter((rule) => {
  if (!`${rule.name} ${rule.description}`.toLowerCase().includes(search.value))
    return false
  if (plugin.value !== 'all' && plugin.value !== rule.category)
    return false
  if ((usage.value === 'configured' && !rule.configured) || (usage.value === 'unused' && rule.configured) || (usage.value === 'modified' && !Object.hasOwn(config.draft.overrides, rule.name)))
    return false
  if (['error', 'warn', 'off'].includes(usage.value) && (!rule.configured || rule.status !== usage.value))
    return false
  if (usage.value === 'overloaded' && declaredLevels(rule).length < 2)
    return false
  if (usage.value === 'offOnly' && (declaredLevels(rule).length !== 1 || declaredLevels(rule)[0] !== 'off'))
    return false
  return attribute.value === 'all' || (attribute.value === 'active' && !rule.deprecated) || (attribute.value === 'fixable' && rule.fixable) || (attribute.value === 'recommended' && rule.recommended) || (attribute.value === 'deprecated' && rule.deprecated)
}))
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 40)))
const visible = computed(() => filtered.value.slice((page.value - 1) * 40, page.value * 40))
const selected = computed(() => filtered.value.find(rule => rule.name === config.selectedRule) ?? filtered.value.find(rule => rule.name === route.query.rule) ?? visible.value[0])
const labels = { error: '错误', warn: '警告', off: '关闭' }
watch([
  query,
  plugin,
  usage,
  attribute,
  () => config.mode,
], () => { page.value = 1 })
watch(pages, (count) => {
  page.value = Math.min(page.value, count)
})
</script>

<template>
  <section class="rules-layout">
    <header class="rules-controls">
      <div class="directory-toolbar">
        <input v-model="query" type="search" class="search-input" aria-label="搜索规则名称或说明" placeholder="搜索规则名称、描述…"><ToggleGroupRoot type="single" :model-value="grid ? 'grid' : 'list'" class="view-switch" aria-label="规则视图" @update:model-value="$event && (grid = $event === 'grid')">
          <ToggleGroupItem value="list">
            <span class="i-lucide-list" aria-hidden="true" />列表
          </ToggleGroupItem><ToggleGroupItem value="grid">
            <span class="i-lucide-layout-grid" aria-hidden="true" />卡片
          </ToggleGroupItem>
        </ToggleGroupRoot>
      </div>
      <div class="filter-row plugins">
        <h3 class="filter-label">
          <span class="i-lucide-plug" aria-hidden="true" />插件
        </h3><ToggleGroupRoot type="single" :model-value="plugin" class="filter-chips" aria-label="规则插件" @update:model-value="$event && (plugin = String($event))">
          <ToggleGroupItem value="all" :class="{ active: plugin === 'all' }">
            <span class="i-lucide-layers" aria-hidden="true" />全部插件 <small>{{ plugins.length }}</small>
          </ToggleGroupItem><ToggleGroupItem v-for="name in plugins" :key="name" :value="name" :class="{ active: plugin === name }">
            <code>{{ name }}</code><small>{{ pluginCounts[name] }}</small>
          </ToggleGroupItem>
        </ToggleGroupRoot>
      </div>
      <div class="filter-row">
        <h3 class="filter-label">
          <span class="i-lucide-list-filter" aria-hidden="true" />使用情况
        </h3><ToggleGroupRoot type="single" :model-value="usage" class="filter-chips" aria-label="规则使用范围" @update:model-value="$event && (usage = String($event))">
          <ToggleGroupItem v-for="item in [{ key: 'all', label: '全部', icon: 'i-lucide-layers' }, { key: 'configured', label: '已配置', icon: 'i-lucide-circle-check' }, { key: 'unused', label: '未配置', icon: 'i-lucide-circle-dashed' }, { key: 'error', label: '错误', icon: 'i-lucide-circle-alert' }, { key: 'warn', label: '警告', icon: 'i-lucide-triangle-alert' }, { key: 'off', label: '显式关闭', icon: 'i-lucide-ban' }, { key: 'overloaded', label: '多种声明级别', icon: 'i-lucide-layers-3' }, { key: 'offOnly', label: '仅关闭', icon: 'i-lucide-circle-slash' }, { key: 'modified', label: '已修改', icon: 'i-lucide-file-pen-line' }]" :key="item.key" :class="{ active: usage === item.key }" :value="item.key">
            <span :class="item.icon" aria-hidden="true" />{{ item.label }}
          </ToggleGroupItem>
        </ToggleGroupRoot>
      </div>
      <div class="filter-row">
        <h3 class="filter-label">
          <span class="i-lucide-badge-check" aria-hidden="true" />规则状态
        </h3><ToggleGroupRoot type="single" :model-value="attribute" class="filter-chips" aria-label="规则属性" @update:model-value="$event && (attribute = String($event))">
          <ToggleGroupItem v-for="item in [{ value: 'all', label: '全部属性', icon: 'i-lucide-layers' }, { value: 'active', label: '活动规则', icon: 'i-lucide-circle-check' }, { value: 'fixable', label: '可修复', icon: 'i-lucide-wrench' }, { value: 'recommended', label: '推荐', icon: 'i-lucide-badge-check' }, { value: 'deprecated', label: '废弃', icon: 'i-lucide-circle-slash' }]" :key="item.value" :value="item.value" :class="{ active: attribute === item.value }">
            <span :class="item.icon" aria-hidden="true" />{{ item.label }}
          </ToggleGroupItem>
        </ToggleGroupRoot>
      </div>
      <div class="directory-summary">
        <span><span class="i-lucide-list-checks" aria-hidden="true" />匹配 {{ filtered.length }} 条 / 共 {{ config.rules.length }} 条规则</span><span class="snapshot-source">{{ config.resolvedCurrent ? '当前文件实际解析' : `默认示例 · ${config.metadata?.filename ?? '读取中'}` }}</span><button class="text-link" :disabled="experiment.running || experiment.preparing" @click="experiment.run('inspect')">
          <span class="i-lucide-scan-search" aria-hidden="true" />解析当前配置
        </button>
      </div>
      <p v-if="experiment.error" role="alert" class="notice error">
        {{ experiment.error }}
      </p>
    </header>
    <section class="rule-directory">
      <ContextMenuRoot>
        <ContextMenuTrigger as-child @contextmenu.capture="showRuleMenu">
          <div class="directory-results" role="group" tabindex="0" aria-label="规则目录操作">
            <Scroll v-if="!grid" class="table-scroll" label="规则目录列表">
              <table>
                <thead>
                  <tr>
                    <th>规则名称与说明</th>
                    <th>级别</th>
                    <th>配置值</th>
                    <th>声明级别 / 属性</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rule in visible" :key="rule.name" :data-rule-name="rule.name" :class="{ selected: selected?.name === rule.name }">
                    <td>
                      <button @click="config.selectedRule = rule.name">
                        <code>{{ rule.name }}</code>
                        <span>{{ rule.description || '上游未提供说明' }}</span>
                      </button>
                    </td>
                    <td>
                      <span v-if="rule.configured" class="tag" :class="rule.status === 'error' ? 'red' : rule.status === 'warn' ? 'amber' : ''"><span :class="rule.status === 'error' ? 'i-lucide-circle-alert' : rule.status === 'warn' ? 'i-lucide-triangle-alert' : 'i-lucide-ban'" aria-hidden="true" />{{ labels[rule.status] }}</span>
                      <span v-else class="tag">未配置</span>
                    </td>
                    <td>
                      <code class="rule-value">{{ rule.configured ? rule.value : '·' }}</code>
                    </td>
                    <td>
                      <span class="declaration-levels"><Hint v-for="level in declaredLevels(rule)" :key="level" class="tag" :class="level === 'error' ? 'red' : level === 'warn' ? 'amber' : ''" :text="`原始声明：${labels[level]}`">{{ labels[level] }}</Hint></span>
                      <span v-if="Object.hasOwn(config.draft.overrides, rule.name)" class="tag amber">已修改</span>
                      <RuleMeta :rule="rule" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </Scroll>
            <div v-else class="rule-cards">
              <button v-for="rule in visible" :key="rule.name" :data-rule-name="rule.name" @click="config.selectedRule = rule.name">
                <code>{{ rule.name }}</code>
                <p>{{ rule.description || '上游未提供说明' }}</p>
                <span class="tag">{{ rule.configured ? labels[rule.status] : '未配置' }}</span>
                <RuleMeta :rule="rule" />
              </button>
            </div>
          </div>
        </ContextMenuTrigger><ContextMenuPortal to=".workbench">
          <ContextMenuContent class="export-menu">
            <ContextMenuLabel class="rule-menu-label">
              {{ contextRule }}
            </ContextMenuLabel><ContextMenuItem class="export-menu-item" @select="config.selectedRule = contextRule">
              <span class="i-lucide-sliders-horizontal" aria-hidden="true" />查看与编辑规则
            </ContextMenuItem><ContextMenuItem class="export-menu-item" @select="config.copy(contextRule)">
              <span class="i-lucide-copy" aria-hidden="true" />复制规则名称
            </ContextMenuItem><ContextMenuItem as-child>
              <RouterLink class="export-menu-item" :to="{ name: 'experiment' }" @click="config.selectedRule = contextRule"><span class="i-lucide-flask-conical" aria-hidden="true" />在代码实验中调整</RouterLink>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>
      <p v-if="!visible.length" class="empty">
        {{ config.loading ? '正在读取规则…' : '没有符合条件的规则' }}
      </p>
      <PaginationRoot v-model:page="page" :total="filtered.length" :items-per-page="40" :sibling-count="1" show-edges class="pagination" aria-label="规则目录分页">
        <span>{{ filtered.length ? (page - 1) * 40 + 1 : 0 }}–{{ Math.min(page * 40, filtered.length) }} / {{ filtered.length }} 条</span>
        <div>
          <PaginationPrev class="btn" aria-label="上一页规则">
            <span class="i-lucide-chevron-left" aria-hidden="true" />
          </PaginationPrev>
          <PaginationList v-slot="{ items }" class="pagination-numbers">
            <template v-for="(item, index) in items" :key="index">
              <PaginationListItem v-if="item.type === 'page'" class="btn" :value="item.value" :aria-label="`第 ${item.value} 页规则`">
                {{ item.value }}
              </PaginationListItem><PaginationEllipsis v-else :index="index">
                …
              </PaginationEllipsis>
            </template>
          </PaginationList>
          <PaginationNext class="btn" aria-label="下一页规则">
            <span class="i-lucide-chevron-right" aria-hidden="true" />
          </PaginationNext>
        </div>
      </PaginationRoot>
    </section>
    <Detail v-if="selected" :rule="selected" />
    <aside v-else class="empty">
      选择规则查看说明、参数与来源
    </aside>
  </section>
</template>

<style scoped lang="scss">
.rules-layout {
  display:grid;
  grid-template-columns:minmax(0,1fr) 350px;
  gap:16px;
  align-items:start;
}

.rules-controls {
  grid-column:1/-1;
  padding:18px 20px;
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:10px;
}

.directory-toolbar {
  display:flex;
  gap:12px;
  align-items:center;
  margin-bottom:16px;
}

.directory-toolbar input {
  flex:1;
  min-width:0;
}

.view-switch {
  display:flex;
  flex-shrink:0;
  gap:3px;
  padding:3px;
  border:1px solid var(--line);
  border-radius:6px;
}

.view-switch button {
  display:flex;
  gap:5px;
  align-items:center;
  padding:5px 9px;
  font-size:12px;
  color:var(--muted);
  border-radius:4px;
}

.view-switch button[data-state='on'] {
  color:var(--accent);
  background:var(--brand-soft);
}

.filter-row {
  display:flex;
  gap:14px;
  align-items:flex-start;
  margin:8px 0;
}

.filter-label {
  display:flex;
  flex:0 0 84px;
  gap:7px;
  align-items:center;
  padding:6px 0;
  margin:0;
  font-size:12px;
  font-weight:500;
  color:var(--muted);
}

.filter-chips {
  display:flex;
  flex:1;
  flex-wrap:wrap;
  gap:5px;
  min-width:0;
}

.filter-chips button {
  display:inline-flex;
  gap:5px;
  align-items:center;
  padding:5px 8px;
  font-size:11px;
  color:var(--muted);
  border:1px solid var(--line);
  border-radius:5px;
}

.filter-chips code {
font-size:11px;
}

.filter-chips small {
font-size:10px;
opacity:.7;
}

.filter-chips [class*='i-lucide-'],.filter-label [class*='i-lucide-'] {
  flex-shrink:0;
  width:13px;
  height:13px;
}

.filter-chips button:hover {
background:var(--well);
}

.filter-chips button.active {
  font-weight:500;
  color:var(--accent);
  background:var(--brand-soft);
  border-color:color-mix(in srgb,var(--accent) 25%,var(--line));
}

.directory-summary {
  display:flex;
  flex-wrap:wrap;
  gap:10px 16px;
  align-items:center;
  padding-top:14px;
  margin:14px 0 0;
  font-size:11px;
  color:var(--muted);
  border-top:1px solid var(--line);
}

.directory-summary > span:first-child {
display:flex;
gap:6px;
align-items:center;
}

.snapshot-source {
margin-left:auto;
}

.directory-summary .text-link {
display:flex;
gap:5px;
align-items:center;
color:var(--accent);
}

.rule-directory {
  min-width:0;
  padding:0 16px;
  background:var(--surface);
  border:1px solid var(--line);
  border-radius:10px;
}
// 保留横向滚动，本页纵向完整排版，避免末行被固定高度裁切。
.table-scroll {
height:auto;
}

.table-scroll :deep(.scroll-viewport) {
height:auto;
}

table {
width:100%;
border-collapse:collapse;
}

th {
padding:13px 8px;
font-size:11px;
font-weight:500;
color:var(--muted);
text-align:left;
border-bottom:1px solid var(--line);
}

td {
padding:12px 8px;
font-size:11px;
vertical-align:middle;
border-bottom:1px solid var(--line);
}

tr.selected {
background:color-mix(in srgb,var(--accent) 7%,var(--surface));
}

td button {
display:block;
width:100%;
text-align:left;
}

td button code {
font-size:12px;
color:var(--accent);
overflow-wrap:anywhere;
}

td button > span {
display:block;
max-width:450px;
margin-top:5px;
font-size:11px;
line-height:1.6;
color:var(--muted);
}

.rule-value {
display:block;
max-width:180px;
overflow:hidden;
text-overflow:ellipsis;
font-size:11px;
color:var(--muted);
white-space:nowrap;
}

.declaration-levels {
display:inline-flex;
flex-wrap:wrap;
gap:4px;
}

td .tag {
display:inline-flex;
gap:3px;
align-items:center;
margin:2px;
white-space:nowrap;
}

td .tag > [class*='i-lucide-'] {
width:11px;
height:11px;
}

.pagination,.pagination > div,.pagination-numbers {
display:flex;
flex-wrap:wrap;
gap:4px;
align-items:center;
}

.pagination {
gap:12px;
justify-content:space-between;
padding:14px 0;
font-size:11px;
color:var(--muted);
}

.pagination-numbers [data-selected] {
color:var(--accent);
background:var(--brand-soft);
}

.rule-cards {
display:grid;
grid-template-columns:repeat(2,minmax(0,1fr));
gap:12px;
padding-top:16px;
}

.rule-cards > button {
padding:14px;
text-align:left;
background:var(--soft);
border:1px solid var(--line);
border-radius:7px;
}

.rule-cards code {
font-size:12px;
color:var(--accent);
overflow-wrap:anywhere;
}

.rule-cards p {
margin:8px 0;
font-size:11px;
line-height:1.6;
color:var(--muted);
}

.rule-cards .tag {
display:inline-flex;
gap:4px;
align-items:center;
margin-right:5px;
}

@media(width <=1150px) {
  .rules-layout {
grid-template-columns:minmax(0,1fr) 310px;
}
}

@media(width <=900px) {
  .rules-layout {
grid-template-columns:minmax(0,1fr);
}

  .rules-controls {
grid-column:1;
}
}

@media(width <=600px) {
  .rules-controls {
padding:14px 12px;
}

  .filter-row {
flex-direction:column;
gap:3px;
margin:12px 0;
}

  .filter-label {
flex-basis:auto;
padding:3px 0;
}

  .directory-toolbar {
gap:6px;
}

  .view-switch button {
padding:5px;
font-size:11px;
}

  .snapshot-source {
margin-left:0;
}

  .rule-cards {
grid-template-columns:1fr;
}

  .rule-directory {
padding:0 10px;
}
}
</style>
