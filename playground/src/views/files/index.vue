<script setup lang="ts">
// 文件页只编排工作区选择、导入和解析；匹配数据与原文仍由实验 Store 持有。
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Scroll from '../../components/scroll/index.vue'
import Select from '../../components/select/index.vue'
import Tree from '../../components/tree/index.vue'
import { useConfigStore, useExperimentStore } from '../../stores/index'
import Detail from './components/Detail.vue'

const config = useConfigStore()
const experiment = useExperimentStore()
const router = useRouter()
const tree = ref<InstanceType<typeof Tree>>()
const view = ref('tree')
const query = ref('')
const filter = ref('all')
const selected = ref('')
const contextPath = ref('')
const expandedGroups = ref<string[]>([])
const compactQuery = window.matchMedia('(max-width: 700px)')
const compact = ref(compactQuery.matches)
function resize(event: MediaQueryListEvent) {
  compact.value = event.matches
}
onMounted(() => compactQuery.addEventListener('change', resize))
onUnmounted(() => compactQuery.removeEventListener('change', resize))
const files = computed(() => experiment.matchingRun?.result.workspace ?? [])
const configs = computed(() => experiment.matchingRun?.result.configs ?? config.metadata?.configs ?? [])
const paths = computed(() => Object.keys(experiment.workspace))
const supported = computed(() => new Set(Object.keys(experiment.supportedFiles)))
const results = computed(() => new Map(files.value.map(file => [file.filename, file])))
const visible = computed(() => paths.value.filter((path) => {
  if (!path.toLowerCase().includes(query.value.trim().toLowerCase()))
    return false
  const file = results.value.get(path)
  return filter.value === 'all'
    || (filter.value === 'unsupported' && !supported.value.has(path))
    || (filter.value === 'pending' && supported.value.has(path) && !file)
    || (filter.value === 'included' && file && !file.ignored)
    || (filter.value === 'ignored' && file?.ignored)
}))
const current = computed(() => results.value.get(selected.value))
const groups = computed(() => {
  const grouped = new Map<string, { key: string, indices?: number[], files: string[] }>()
  for (const path of visible.value) {
    const file = results.value.get(path)
    const key = !supported.value.has(path)
      ? 'unsupported'
      : !file
          ? 'pending'
          : file.ignored
            ? 'ignored'
            : file.matchedConfigs
              ? `configs:${file.matchedConfigs.join(',')}`
              : 'unavailable'
    const group = grouped.get(key) ?? { key, indices: file?.matchedConfigs, files: [] }
    group.files.push(path)
    grouped.set(key, group)
  }
  return [
    ...grouped.values(),
  ]
})
watch([
  paths,
  () => config.draft.filename,
], () => {
  if (paths.value.includes(config.draft.filename))
    selected.value = config.draft.filename
  else if (!paths.value.includes(selected.value))
    selected.value = paths.value[0] ?? ''
}, { immediate: true })
watch(query, async () => {
  await nextTick()
  if (query.value)
    tree.value?.expandAll()
})
function select(path: string) {
  selected.value = path
  if (supported.value.has(path))
    experiment.selectFile(path)
}
function locate(path: string) {
  query.value = ''
  filter.value = 'all'
  select(path)
}
function openExperiment(path: string) {
  select(path)
  void router.push({ name: 'experiment' })
}
function fileStatus(path: string) {
  if (!supported.value.has(path))
    return '不支持'
  const result = results.value.get(path)
  return !result
    ? '待解析'
    : result.ignored
      ? '忽略'
      : `${Object.keys(result.rules).length} 条规则`
}
function groupLabel(key: string) {
  return key === 'unsupported'
    ? '当前工具不支持'
    : key === 'pending'
      ? '尚未解析'
      : key === 'ignored'
        ? '被忽略或未包含'
        : key === 'unavailable'
          ? '引擎未公开逐项匹配'
          : '相同配置匹配链'
}
function context(event: MouseEvent) {
  const path = (event.target as HTMLElement).closest<HTMLElement>('[data-file-path]')?.dataset.filePath
  if (path) {
    contextPath.value = path
    return
  }
  event.preventDefault()
  event.stopPropagation()
}
async function imported(event: Event) {
  const input = event.target as HTMLInputElement
  await experiment.importFiles(input.files)
  input.value = ''
}
</script>

<template>
  <section class="files-page">
    <header class="files-heading">
      <div><h2><span class="i-lucide-files" aria-hidden="true" />工作区文件与配置匹配</h2><p>{{ Object.keys(experiment.imported).length ? '已导入工作区' : '沙箱示例文件' }} · 选择文件查看匹配，右键打开文件操作</p></div><div class="file-import">
        <label class="btn" for="import-directory"><span class="i-lucide-folder-up" aria-hidden="true" />导入目录<input id="import-directory" type="file" webkitdirectory multiple @change="imported"></label><label class="btn" for="import-files"><span class="i-lucide-file-up" aria-hidden="true" />导入文件<input id="import-files" type="file" multiple @change="imported"></label><button v-if="Object.keys(experiment.imported).length" class="btn" @click="experiment.clearFiles">
          清除导入
        </button><button class="btn primary" :disabled="experiment.running || experiment.preparing || !supported.size" @click="experiment.run('files')">
          <span class="i-lucide-scan-search" aria-hidden="true" />{{ experiment.running ? '解析中…' : '解析工作区匹配' }}
        </button><button v-if="experiment.running" class="btn" @click="experiment.cancel">
          取消
        </button>
      </div>
    </header>
    <div class="files-summary" role="group" aria-label="文件匹配摘要">
      <span><strong>{{ paths.length }}</strong> 个文件</span><span><strong>{{ supported.size }}</strong> 个当前支持</span><span class="included"><strong>{{ files.length ? files.filter(file => !file.ignored).length : '·' }}</strong> 个上次包含</span><span class="ignored"><strong>{{ files.length ? files.filter(file => file.ignored).length : '·' }}</strong> 个上次忽略</span><span><strong>{{ experiment.unsupportedFiles.length }}</strong> 个不支持</span><span class="scope-note">拖入文件可追加；同路径重新导入会替换原文和编辑内容。</span>
    </div>
    <p v-if="experiment.error || experiment.importError" role="alert" class="notice error">
      {{ experiment.error || experiment.importError }}
    </p><p v-if="experiment.matchingStale" class="notice stale-result">
      配置或工作区内容已变化。保留上次解析结果，新文件标记为待解析，请重新解析。
    </p>
    <div class="files-size">
      <SplitterGroup :key="String(compact)" :direction="compact ? 'vertical' : 'horizontal'" :auto-save-id="`lint-files-${compact ? 'compact' : 'wide'}`" class="files-workspace" @dragover.prevent @drop.prevent="experiment.importFiles($event.dataTransfer?.files ?? null)">
        <SplitterPanel id="explorer" :default-size="compact ? 35 : 30" :min-size="compact ? 20 : 22" :max-size="compact ? 60 : 55" class="files-explorer">
          <div class="explorer-heading">
            <h3>文件资源管理器 <span class="tag">{{ visible.length }} / {{ paths.length }}</span></h3><div>
              <button class="text-link" :disabled="view === 'list'" aria-label="全部展开" @click="tree?.expandAll();expandedGroups = groups.map(group => group.key)">
                <span class="i-lucide-unfold-vertical" aria-hidden="true" />
              </button><button class="text-link" :disabled="view === 'list'" aria-label="全部收起" @click="tree?.collapseAll();expandedGroups = []">
                <span class="i-lucide-fold-vertical" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="explorer-controls">
            <input v-model="query" class="search-input" aria-label="筛选工作区文件" placeholder="搜索文件路径…"><Select v-model="filter" aria-label="筛选文件匹配状态" :options="[{ value: 'all', label: '全部状态' }, { value: 'included', label: '包含' }, { value: 'ignored', label: '忽略' }, { value: 'pending', label: '待解析' }, { value: 'unsupported', label: '不支持' }]" />
          </div>
          <ToggleGroupRoot type="single" :model-value="view" class="explorer-views segments" aria-label="文件展示方式" @update:model-value="$event && (view = String($event))">
            <ToggleGroupItem value="tree" :class="{ active: view === 'tree' }">
              <span class="i-lucide-folder-tree" aria-hidden="true" />目录树
            </ToggleGroupItem><ToggleGroupItem value="list" :class="{ active: view === 'list' }">
              <span class="i-lucide-list" aria-hidden="true" />文件列表
            </ToggleGroupItem><ToggleGroupItem value="groups" :class="{ active: view === 'groups' }">
              <span class="i-lucide-layers" aria-hidden="true" />匹配分组
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <ContextMenuRoot>
            <ContextMenuTrigger as-child @contextmenu.capture="context">
              <div class="explorer-body">
                <Scroll label="工作区文件">
                  <Tree v-if="view === 'tree'" ref="tree" :paths="visible" :selected="selected" :root-label="Object.keys(experiment.imported).length ? '导入工作区' : '沙箱示例'" @select="select">
                    <template #suffix="{ path }">
                      <span class="file-result" :class="{ ignored: results.get(path)?.ignored, unsupported: !supported.has(path) }">{{ fileStatus(path) }}</span>
                    </template>
                  </Tree><div v-else-if="view === 'list'" class="file-list">
                    <button v-for="path in visible" :key="path" class="file-entry" :class="{ selected: selected === path }" :data-file-path="path" @click="select(path)">
                      <span class="i-lucide-file-code-2" aria-hidden="true" /><code>{{ path }}</code><span class="file-result">{{ fileStatus(path) }}</span>
                    </button>
                  </div><AccordionRoot v-else v-model="expandedGroups" type="multiple" class="file-groups">
                    <AccordionItem v-for="group in groups" :key="group.key" :value="group.key">
                      <AccordionHeader>
                        <AccordionTrigger class="group-trigger">
                          <span class="i-lucide-layers" aria-hidden="true" />{{ groupLabel(group.key) }}<span class="tag">{{ group.files.length }}</span>
                        </AccordionTrigger>
                      </AccordionHeader><AccordionContent>
                        <div class="group-configs">
                          <RouterLink v-for="item in configs.filter(item => group.indices?.includes(item.index))" :key="item.index" :to="{ name: 'overview' }" @click="config.selectedConfig = item.index">{{ item.name }}</RouterLink>
                        </div><button v-for="path in group.files" :key="path" class="file-entry" :class="{ selected: selected === path }" :data-file-path="path" @click="select(path)">
                          <span class="i-lucide-file-code-2" aria-hidden="true" /><code>{{ path }}</code><span class="file-result">{{ fileStatus(path) }}</span>
                        </button>
                      </AccordionContent>
                    </AccordionItem>
                  </AccordionRoot><div v-if="!visible.length" class="empty">
                    <p>没有符合筛选条件的文件。</p><button class="text-link" @click="query = '';filter = 'all'">
                      清除搜索
                    </button>
                  </div>
                </Scroll>
              </div>
            </ContextMenuTrigger><ContextMenuPortal to=".workbench">
              <ContextMenuContent class="export-menu file-context-menu">
                <ContextMenuLabel class="rule-menu-label">
                  {{ contextPath }}
                </ContextMenuLabel><ContextMenuItem class="export-menu-item" @select="select(contextPath)">
                  <span class="i-lucide-file-search" aria-hidden="true" />查看匹配详情
                </ContextMenuItem><ContextMenuItem class="export-menu-item" @select="config.copy(contextPath)">
                  <span class="i-lucide-copy" aria-hidden="true" />复制文件路径
                </ContextMenuItem><ContextMenuSeparator class="menu-separator" /><ContextMenuItem class="export-menu-item" :disabled="!supported.has(contextPath)" @select="openExperiment(contextPath)">
                  <span class="i-lucide-flask-conical" aria-hidden="true" />使用此文件实验
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenuPortal>
          </ContextMenuRoot>
        </SplitterPanel>
        <SplitterResizeHandle class="files-resize-handle" :class="{ vertical: compact }" aria-label="调整文件目录与匹配详情大小" />
        <SplitterPanel id="detail" :default-size="compact ? 65 : 70" :min-size="35" class="file-inspector">
          <Detail v-if="selected" :path="selected" :file="current" :configs="configs" :workspace="files" :stale="experiment.matchingStale" :unsupported="!supported.has(selected)" :imported="Object.hasOwn(experiment.imported, selected)" :source="experiment.workspace[selected]" @select-file="locate" @copy="config.copy(selected)" @experiment="openExperiment(selected)" /><p v-else class="empty">
            导入文件或选择左侧文件以查看匹配详情。
          </p>
        </SplitterPanel>
      </SplitterGroup>
    </div>
  </section>
</template>

<style scoped lang="scss">
.files-heading {
display:flex;
flex-wrap:wrap;
gap:12px;
align-items:center;
justify-content:space-between;
padding:16px 0 12px;
}

.files-heading h2 {
display:flex;
gap:8px;
align-items:center;
font-size:15px;
}

.files-heading p {
margin-top:7px;
font-size:11px;
color:var(--muted);
}

.file-import {
display:flex;
flex-wrap:wrap;
gap:6px;
align-items:center;
}

.file-import label {
position:relative;
cursor:pointer;
}

.file-import input {
position:absolute;
inset:0;
width:100%;
cursor:pointer;
opacity:0;
}

.files-summary {
display:flex;
flex-wrap:wrap;
gap:16px;
align-items:center;
padding:12px 0;
margin-bottom:10px;
font-size:11px;
color:var(--muted);
border-top:1px solid var(--line);
}

.files-summary strong {
margin-right:4px;
font-size:14px;
color:var(--text);
}

.included {
color:var(--success);
}

.ignored,.unsupported {
color:var(--warning);
}

.scope-note {
margin-left:auto;
}

.files-size {
height:calc(100dvh - 380px);
min-height:460px;
max-height:1200px;
}

.files-workspace {
border:1px solid var(--line);
border-radius:8px;
}

.files-explorer {
display:flex;
flex-direction:column;
min-width:0;
background:var(--soft);
}

.explorer-heading {
display:flex;
gap:8px;
align-items:center;
justify-content:space-between;
padding:14px 12px;
}

.explorer-heading h3 {
display:flex;
gap:7px;
align-items:center;
font-size:12px;
}

.explorer-heading > div {
display:flex;
gap:10px;
}

.explorer-controls {
display:flex;
flex-wrap:wrap;
gap:6px;
padding:0 12px 10px;
}

.explorer-controls input {
flex:1;
width:100%;
min-width:100px;
}

.explorer-views {
display:flex;
flex-shrink:0;
margin:0 12px 10px;
}

.explorer-views button {
display:flex;
flex:1;
gap:5px;
align-items:center;
justify-content:center;
padding:7px 4px;
font-size:11px;
white-space:nowrap;
}

.explorer-views .active {
color:var(--accent);
background:var(--brand-soft);
}

.files-explorer :deep(.file-tree) { padding:4px;
border:0;
border-radius:0;
}

.files-explorer :deep(.tree-chevron) { flex-shrink:0;
width:12px;
height:12px;
}

.files-explorer :deep(.tree-chevron.expanded) { transform:rotate(90deg);
}

.explorer-body {
flex:1;
min-height:0;
}

.file-entry {
display:flex;
gap:7px;
align-items:center;
width:100%;
padding:10px 12px;
font-size:12px;
text-align:left;
}

.file-entry code {
flex:1;
min-width:0;
overflow-wrap:anywhere;
}

.file-entry:hover {
background:var(--well);
}

.file-entry.selected {
color:var(--accent);
background:var(--brand-soft);
}

.file-result {
flex-shrink:0;
margin-left:auto;
font-size:10px;
color:var(--muted);
}

.file-result.ignored,.file-result.unsupported {
color:var(--warning);
}

.group-trigger {
display:flex;
gap:7px;
align-items:center;
width:100%;
padding:12px;
font-size:12px;
text-align:left;
border-bottom:1px solid var(--line);
}

.group-trigger .tag {
margin-left:auto;
}

.group-configs {
display:grid;
gap:5px;
padding:8px 12px;
font-size:10px;
color:var(--accent);
overflow-wrap:anywhere;
}

.files-resize-handle {
flex:0 0 5px;
background:var(--line);
transition:background .15s;
}

.files-resize-handle:hover,.files-resize-handle:focus-visible,.files-resize-handle[data-state='drag'] {
background:var(--accent);
}

.file-inspector {
min-width:0;
background:var(--surface);
}

@media(width <=700px) { .files-size {
height:900px;
min-height:700px;
}

 .scope-note {
display:none;
}

 .files-heading {
align-items:flex-start;
}

 .files-summary {
gap:10px;
}

 .files-heading .btn {
padding:6px 8px;
font-size:11px;
} }
</style>
