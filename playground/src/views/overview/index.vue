<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { computed, defineAsyncComponent, nextTick, onActivated, onBeforeUnmount, ref, watch } from 'vue'
import { useConfigStore, useExperimentStore } from '../../stores/index'
import Config from './components/Config.vue'
import Merged from './components/Merged.vue'

defineProps<{ dark: boolean }>()
const Chart = defineAsyncComponent(() => import('../../components/chart/index.vue'))
const config = useConfigStore()
const experiment = useExperimentStore()
const query = ref('')
const expanded = ref<boolean>()
const file = ref('')
const completePath = computed(() => experiment.acceptsFile(file.value.trim()))
const matchError = computed(() => completePath.value && file.value.trim() === config.draft.filename
  ? experiment.error.split('\n')[0]?.replace(/^Error:\s*/, '') ?? ''
  : '')
const fileOptions = computed(() => Object.keys(experiment.workspace))
const fileSuggestions = computed(() => {
  const query = file.value.trim().toLowerCase()
  return fileOptions.value.filter(path => !query || path.toLowerCase().includes(query))
})
const kind = ref('all')
const resultView = ref('configs')
const matching = computed(() => !!file.value.trim() && config.resolvedCurrent && config.draft.filename === file.value.trim())
watch(matching, (available) => {
  if (!available)
    resultView.value = 'configs'
})
const canMatch = computed(() => matching.value && config.resolved?.matchedConfigs !== undefined)
watch(() => config.mode, () => {
  file.value = ''
  resultView.value = 'configs'
  query.value = ''
  kind.value = 'all'
})
const hasCatalog = computed(() => !!config.metadata || config.resolvedCurrent)
const statusChart = computed<EChartsOption>(() => ({
  legend: { bottom: 0, icon: 'circle' },
  series: [
    {
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '43%'],
      label: { show: false },
      data: [
        {
          name: '错误级别',
          value: config.rules.filter(rule => rule.configured && rule.status === 'error').length,
          itemStyle: { color: '#175cd3' },
        },
        {
          name: '警告级别',
          value: config.rules.filter(rule => rule.configured && rule.status === 'warn').length,
          itemStyle: { color: '#b88732' },
        },
        {
          name: '显式关闭',
          value: config.rules.filter(rule => rule.configured && rule.status === 'off').length,
          itemStyle: { color: '#8a94a5' },
        },
        {
          name: '未配置',
          value: config.rules.filter(rule => !rule.configured).length,
          itemStyle: { color: '#cbd2dc' },
        },
      ],
    },
  ],
}))
const searchable = computed(() => config.configs.map(item => ({
  item,
  text: JSON.stringify(item).toLowerCase(),
})))
const entries = computed(() => searchable.value.filter(({ item, text }) => {
  if (!text.includes(query.value.trim().toLowerCase()))
    return false
  if (canMatch.value && !config.resolved?.matchedConfigs?.includes(item.index))
    return false
  if (kind.value === 'rules')
    return Object.keys(item.rules).length > 0
  if (kind.value === 'files')
    return item.files.length > 0
  if (kind.value === 'ignores')
    return item.ignores.length > 0
  if (kind.value === 'plugins')
    return !!item.plugins?.length
  return true
}).map(({ item }) => item))
let matchTimer: ReturnType<typeof setTimeout> | undefined
async function testPath() {
  clearTimeout(matchTimer)
  if (!completePath.value || experiment.running || experiment.preparing)
    return
  if (file.value.trim())
    config.draft.filename = file.value.trim()
  await experiment.run('inspect')
}
let attemptedPath = ''
watch([
  file,
  () => experiment.preparing,
  () => experiment.running,
], ([value, preparing, running]) => {
  clearTimeout(matchTimer)
  if (!value.trim()) {
    attemptedPath = ''
    resultView.value = 'configs'
    return
  }
  if (!completePath.value || experiment.preparationError || preparing || running || value.trim() === attemptedPath)
    return
  matchTimer = setTimeout(() => {
    attemptedPath = value.trim()
    void testPath()
  }, 350)
})
onBeforeUnmount(() => clearTimeout(matchTimer))
onActivated(async () => {
  if (config.selectedConfig) {
    await nextTick()
    const element = document.getElementById(`config-${config.selectedConfig}`) as HTMLDetailsElement | null
    if (element) {
      element.open = true
      element.scrollIntoView({ block: 'start' })
    }
  }
})
</script>

<template>
  <section class="config-overview">
    <div class="overview-layout">
      <section class="panel configuration-panel">
        <div class="overview-heading">
          <div>
            <h2><span class="i-lucide-layers" aria-hidden="true" />配置组成</h2>
            <p>由 {{ config.configs.length }} 个配置项按顺序组合 · {{ config.resolvedCurrent ? '当前引擎声明' : '默认配置' }}</p>
          </div>
          <span v-if="config.rules.some(rule => rule.deprecated && rule.configured && rule.status !== 'off')" class="tag amber">使用 {{ config.rules.filter(rule => rule.deprecated && rule.configured && rule.status !== 'off').length }} 条已废弃规则</span>
        </div>
        <form class="matching-form" @submit.prevent="testPath">
          <span class="i-lucide-search" aria-hidden="true" />
          <AutocompleteRoot v-model="file" :open-on-focus="true" :open-on-click="true" :ignore-filter="true" class="file-autocomplete">
            <AutocompleteAnchor class="file-autocomplete-anchor">
              <AutocompleteInput class="file-autocomplete-input" aria-label="测试配置匹配路径" :placeholder="`输入或选择虚拟文件路径…（当前 ${config.draft.filename}）`" />
              <AutocompleteCancel v-if="file" class="file-autocomplete-cancel i-lucide-x" aria-label="清除文件路径" />
            </AutocompleteAnchor>
            <AutocompletePortal to=".workbench">
              <AutocompleteContent class="file-autocomplete-content" position="popper">
                <AutocompleteViewport>
                  <AutocompleteEmpty>没有匹配的文件</AutocompleteEmpty><AutocompleteItem v-for="path in fileSuggestions" :key="path" :value="path" :text-value="path" class="file-autocomplete-item">
                    <span class="i-lucide-file-code-2" aria-hidden="true" />{{ path }}
                  </AutocompleteItem>
                </AutocompleteViewport>
              </AutocompleteContent>
            </AutocompletePortal>
          </AutocompleteRoot>
          <button v-if="experiment.running" type="button" class="matching-cancel" @click="experiment.cancel">
            <span class="i-lucide-x" aria-hidden="true" />取消解析
          </button>
        </form>
        <div v-if="matching" class="notice matching-result">
          <span class="i-lucide-file-check" aria-hidden="true" /><code>{{ config.draft.filename }}</code>
          <span>{{ config.resolved!.ignored ? '当前文件未被包含或已被忽略。' : `${config.mode === 'eslint' ? `匹配 ${config.resolved!.matchedConfigs!.length} 个配置项，` : ''}最终合并 ${Object.keys(config.resolved!.rules).length} 条规则。` }}</span>
          <RouterLink :to="{ name: 'files' }">查看文件最终配置 →</RouterLink>
        </div>
        <p v-if="file.trim() && !completePath" class="matching-pending" role="status">
          选择候选文件，或继续输入带扩展名的完整路径后自动匹配。
        </p>
        <p v-else-if="file.trim() && !matching && !matchError && !experiment.preparationError" class="matching-pending" role="status">
          <span class="i-lucide-loader-circle" aria-hidden="true" />{{ experiment.preparing ? '正在准备检查环境，文件匹配将在就绪后自动开始…' : '正在匹配文件配置…' }}
        </p>
        <TabsRoot v-model="resultView">
          <TabsList v-if="matching" class="matching-tabs" aria-label="配置匹配结果">
            <TabsTrigger value="configs">
              <span class="i-lucide-layers" aria-hidden="true" />匹配配置项
            </TabsTrigger><TabsTrigger value="merged">
              <span class="i-lucide-list-checks" aria-hidden="true" />最终合并规则
            </TabsTrigger>
          </TabsList>
          <p v-if="matchError" class="notice error" role="alert">
            {{ matchError }}<span>完整错误信息见代码实验的 Console。</span>
          </p>
          <p v-if="config.mode !== 'eslint'" class="notice">
            {{ config.mode === 'stylelint' ? '这里显示 Stylelint 合并后的配置；不逐层展开继承的预设。' : '这里显示 Markdownlint 合并后的规则。' }}
          </p>
          <div class="config-toolbar">
            <input v-model="query" aria-label="搜索配置内容" :placeholder="resultView === 'merged' ? '搜索合并规则名称或说明…' : '搜索配置名称、插件或规则…'">
            <div>
              <button class="btn" @click="expanded = true">
                <span class="i-lucide-chevrons-down-up" aria-hidden="true" />全部展开
              </button>
              <button class="btn" @click="expanded = false">
                <span class="i-lucide-chevrons-up-down" aria-hidden="true" />全部收起
              </button>
            </div>
          </div>
          <TabsContent value="configs">
            <div class="config-filters">
              <ToggleGroupRoot :model-value="kind" type="single" class="config-kind" aria-label="按配置内容筛选" @update:model-value="kind = typeof $event === 'string' && $event ? $event : 'all'">
                <ToggleGroupItem v-for="item in [{ value: 'all', label: '全部配置' }, { value: 'rules', label: '规则' }, { value: 'files', label: '文件条件' }, { value: 'ignores', label: '忽略条件' }, { value: 'plugins', label: '插件' }]" :key="item.value" :value="item.value">
                  {{ item.label }}
                </ToggleGroupItem>
              </ToggleGroupRoot>
              <span>{{ entries.length }} / {{ config.configs.length }} 项</span>
            </div>
            <p v-if="!entries.length" class="empty">
              <span class="i-lucide-search-x" aria-hidden="true" />{{ config.loading ? '正在读取配置组成…' : '没有匹配的配置项' }} <button v-if="query && !config.loading" class="text-link" @click="query = ''">
                清除搜索
              </button>
            </p>
            <Config v-for="item in entries" :key="`${config.mode}/${item.index}/${expanded}`" :item="item" :open="expanded ?? false" />
          </TabsContent>
          <TabsContent value="merged">
            <Merged :query="query" :expanded="expanded" />
          </TabsContent>
        </TabsRoot>
        <p class="overview-note">
          配置条目内展示原始声明，不将文件条件直接当成匹配结论。解析器、处理器中的函数仅展示身份，完整可执行配置仍由沙箱持有。
        </p>
      </section>
      <div class="metric-grid" role="group" aria-label="配置摘要">
        <div><span class="metric-icon"><span class="i-lucide-layers" aria-hidden="true" /></span><strong>{{ hasCatalog ? config.configs.length : '·' }}</strong><span>配置声明</span></div>
        <div><span class="metric-icon"><span class="i-lucide-circle-check" aria-hidden="true" /></span><strong>{{ hasCatalog ? config.rules.filter(rule => rule.configured && rule.status !== 'off').length : '·' }}</strong><span>启用规则</span></div>
        <div><span class="metric-icon"><span class="i-lucide-wand-sparkles" aria-hidden="true" /></span><strong>{{ hasCatalog ? config.rules.filter(rule => rule.configured && rule.fixable && rule.status !== 'off').length : '·' }}</strong><span>启用且可修复</span></div>
        <div><span class="metric-icon"><span class="i-lucide-git-compare-arrows" aria-hidden="true" /></span><strong>{{ config.changeCount }}</strong><span>草稿改动</span></div>
      </div>
      <p class="scope-note">
        {{ config.resolvedCurrent ? '摘要基于当前文件实际解析结果。' : '当前显示默认配置。修改配置后，点击解析查看生效结果。' }}
      </p>
      <aside class="overview-aside">
        <section class="panel">
          <div class="section-heading">
            <h2>规则状态分布</h2><span class="tag">{{ config.resolvedCurrent ? '当前解析' : '默认配置' }}</span>
          </div>
          <Chart v-if="hasCatalog" type="pie" :dark="dark" :option="statusChart" label="规则状态分布图" />
          <p v-else class="notice">
            {{ config.error ? '规则资料读取失败，请使用上方重试。' : '正在读取规则目录…' }}
          </p>
          <p class="scope-note">
            数据基于：<code>{{ config.resolvedCurrent ? config.draft.filename : config.metadata?.filename ?? '读取中' }}</code>。未配置与显式关闭分开统计。
          </p>
        </section>
        <section class="panel workflow-panel">
          <h2>接下来可以做什么</h2>
          <RouterLink :to="{ name: 'rules' }"><span class="i-lucide-sliders-horizontal" aria-hidden="true" /><span><strong>调整规则</strong><small>查看参数与来源，追加项目覆盖</small></span><span class="i-lucide-chevron-right" aria-hidden="true" /></RouterLink>
          <RouterLink :to="{ name: 'experiment' }"><span class="i-lucide-flask-conical" aria-hidden="true" /><span><strong>验证配置</strong><small>输入代码，检查并预览修复</small></span><span class="i-lucide-chevron-right" aria-hidden="true" /></RouterLink>
          <RouterLink :to="{ name: 'setup' }"><span class="i-lucide-download" aria-hidden="true" /><span><strong>带回项目</strong><small>下载完整配置和接入脚本</small></span><span class="i-lucide-chevron-right" aria-hidden="true" /></RouterLink>
        </section>
      </aside>
    </div>
  </section>
</template>

<style scoped lang="scss">
.config-filters {
display:flex;
flex-wrap:wrap;
gap:14px;
align-items:center;
margin-bottom:16px;
font-size:11px;
color:var(--muted);

label {
display:flex;
gap:7px;
align-items:center;
}

select {
padding:7px;
border:1px solid var(--line);
border-radius:6px;
}
}

.overview-layout {
display:block;
}

.overview-layout > .metric-grid {
margin-top:20px;
}

.overview-aside {
display:grid;
grid-template-columns:1fr 1fr;
gap:20px;
}

.workflow-panel > a {
display:flex;
gap:12px;
align-items:center;
padding:18px 0;
border-bottom:1px solid var(--line);
}

.workflow-panel > a:last-child {
padding-bottom:0;
border-bottom:0;
}

.workflow-panel > a > span:first-child {
color:var(--accent);
}

.workflow-panel > a > span:nth-child(2) {
flex:1;
}

.workflow-panel strong {
display:block;
font-size:12px;
font-weight:600;
}

.workflow-panel small {
display:block;
margin-top:5px;
font-size:11px;
line-height:1.7;
color:var(--muted);
}

@media(width <=1100px) {
.overview-layout {
grid-template-columns:minmax(0,1fr);
}

 .overview-aside {
grid-template-columns:repeat(2,minmax(0,1fr));
} }

@media(width <=700px) {
.overview-aside {
grid-template-columns:minmax(0,1fr);
} }

.config-overview{
padding:0;
}

.overview-heading{
display:flex;
gap:15px;
align-items:center;
justify-content:space-between;
margin-bottom:22px;

h2{
font-size:15px;
}

p{
margin-top:8px;
font-size:12px;
color:var(--muted);
}
}

.matching-pending{
display:flex;
gap:7px;
align-items:center;
margin:10px 0;
font-size:12px;
color:var(--muted);
}

.config-kind{
display:flex;
flex-wrap:wrap;
gap:5px;

button{
padding:6px 10px;
font-size:12px;
color:var(--muted);
border:1px solid var(--line);
border-radius:999px;
}

button[data-state='on']{
color:var(--accent);
background:var(--brand-soft);
border-color:var(--accent);
}
}

.matching-result,.matching-tabs{
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
}

.matching-tabs{
margin:12px 0;

button{
display:inline-flex;
gap:6px;
align-items:center;
padding:8px 12px;
color:var(--muted);
background:var(--surface);
border:1px solid var(--line);
border-radius:6px;
}

button[data-state='active']{
color:var(--accent);
background:var(--brand-soft);
border-color:var(--accent);
}
}

.matching-form{
display:flex;
gap:10px;
align-items:center;
padding:7px 8px 7px 14px;
margin-bottom:18px;
background:var(--soft);
border:1px solid var(--line);
border-radius:999px;

&:focus-within{
border-color:var(--accent);
box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 22%,transparent);
}

>[class*='i-']{
color:var(--muted);
}

input{
flex:1;
min-width:0;
padding:5px;
font-size:12px;
outline:none;
background:none;
border:0;
}
}

.matching-form :deep(.file-autocomplete){
flex:1;
min-width:0;
}

.file-autocomplete-anchor{
display:flex;
align-items:center;
width:100%;
}

.file-autocomplete-input{
width:100%;
}

.matching-cancel{
display:inline-flex;
flex:none;
gap:4px;
align-items:center;
padding:6px 9px;
font-size:12px;
color:var(--muted);
cursor:pointer;
background:var(--surface);
border:1px solid var(--line);
border-radius:6px;
}

.matching-cancel:hover{
color:var(--accent);
border-color:var(--accent);
}

.file-autocomplete-cancel{
flex:none;
padding:3px;
color:var(--muted);
cursor:pointer;
background:none;
border:0;
}

.config-toolbar{
display:flex;
gap:12px;
align-items:center;
justify-content:space-between;
margin:12px 0 20px;

>input{
width:390px;
min-width:220px;
padding:8px 10px;
font-size:11px;
border:1px solid var(--line);
border-radius:5px;
}

>div{
display:flex;
gap:8px;
}
}

.overview-note{
margin-top:23px;
font-size:11px;
line-height:1.9;
color:var(--muted);
}

.notice a{
margin-left:7px;
color:var(--accent);
}

@media(width <=650px){
.overview-heading{
flex-wrap:wrap;
}

.config-toolbar{
flex-wrap:wrap;

>input{
width:100%;
}
}

.matching-form{
flex-wrap:wrap;

input{
min-width:160px;
}

.btn{
font-size:10px;
}
}
}
</style>

<style>
.workbench .file-autocomplete-content{
z-index:80;
width:var(--reka-combobox-trigger-width);
max-height:260px;
padding:5px;
overflow:auto;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
box-shadow:0 8px 30px rgb(0 0 0 / 14%);
}

.workbench .file-autocomplete-item{
display:flex;
gap:8px;
align-items:center;
padding:8px 9px;
font-size:12px;
cursor:pointer;
border-radius:5px;
}

.workbench .file-autocomplete-item[data-highlighted]{
color:var(--accent);
background:var(--brand-soft);
}
</style>
