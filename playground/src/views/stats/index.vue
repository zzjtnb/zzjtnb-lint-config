<script setup lang="ts">
import type { ECElementEvent, EChartsOption } from 'echarts'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Hint from '../../components/hint/index.vue'
import { useConfigStore, useExperimentStore } from '../../stores/index'

defineProps<{ dark: boolean }>()
const Chart = defineAsyncComponent(() => import('../../components/chart/index.vue'))
const router = useRouter()
const config = useConfigStore()
const experiment = useExperimentStore()
const tab = ref('rules')
watch(() => config.mode, (mode) => {
  tab.value = mode === 'eslint'
    ? 'rules'
    : 'files'
}, { immediate: true })
const workspace = computed(() => experiment.performanceRun?.action === 'stats'
  ? experiment.performanceRun.result.workspace ?? []
  : [])
const files = computed(() => workspace.value.length
  ? workspace.value
  : experiment.performanceRun
    ? [
        { filename: experiment.performanceRun.filename, ...experiment.performanceRun.result },
      ]
    : [])
const tasks = computed(() => files.value.flatMap(file => file.timings ?? []))
const performance = computed(() => files.value.reduce((sum, file) => ({
  rules: sum.rules + (file.performance?.rules ?? 0),
  parse: sum.parse + (file.performance?.parse ?? 0),
  fix: sum.fix + (file.performance?.fix ?? 0),
  total: sum.total + (file.performance?.total ?? 0),
}), { rules: 0, parse: 0, fix: 0, total: 0 }))
const segments = computed(() => [
  { name: '规则执行', value: performance.value.rules, color: '#8a7cdb' },
  { name: '解析', value: performance.value.parse, color: '#e8b64e' },
  { name: '修复', value: performance.value.fix, color: '#6fbc9f' },
  {
    name: '其他',
    value: Math.max(0, performance.value.total - performance.value.rules - performance.value.parse - performance.value.fix),
    color: '#a0adbf',
  },
])
interface Ranking {
  name: string
  detail: string
  value: number
  filename?: string
}
const rankings = computed<Ranking[]>(() => {
  if (tab.value === 'tasks') {
    return tasks.value.map(item => ({
      name: item.rule ?? item.name,
      detail: `${item.filename ?? ''} · ${item.name.split(' · ')[0]}`,
      value: item.milliseconds,
      filename: item.filename,
    }))
  }
  if (tab.value === 'files') {
    return files.value.map(file => ({
      name: file.filename,
      detail: file.ignored ? '被忽略' : '',
      value: file.performance?.total ?? file.duration,
    }))
  }
  const totals = new Map<string, number>()
  for (const task of tasks.value) {
    const key = tab.value === 'plugins'
      ? task.plugin ?? '未知插件'
      : task.rule ?? task.name
    totals.set(key, (totals.get(key) ?? 0) + task.milliseconds)
  }
  return [...totals].map(([name, value]) => ({ name, detail: '', value }))
})
const sorted = computed(() => [...rankings.value].sort((a, b) => b.value - a.value))
const rankingQuery = ref('')
const rankingLimit = ref(30)
const filteredRankings = computed(() => sorted.value.filter(item => `${item.name} ${item.detail}`.toLowerCase().includes(rankingQuery.value.trim().toLowerCase())))
watch([
  tab,
  rankingQuery,
  () => experiment.performanceRun,
], () => { rankingLimit.value = 30 })
watch(() => config.mode, () => {
  rankingQuery.value = ''
})
const denominator = computed(() => tab.value === 'files'
  ? files.value.reduce((sum, file) => sum + (file.performance?.total ?? file.duration), 0)
  : tasks.value.reduce((sum, item) => sum + item.milliseconds, 0))
const maximum = computed(() => Math.max(1, ...sorted.value.map(item => item.value)))
const errors = computed(() => files.value.flatMap(file => file.messages).filter(message => message.severity === 'error').length)
const warnings = computed(() => files.value.flatMap(file => file.messages).filter(message => message.severity === 'warning').length)
const distribution = computed(() => Object.entries(config.rules.reduce((sum, rule) => {
  sum[rule.category] = (sum[rule.category] ?? 0) + 1
  return sum
}, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]))
const timingChart = computed<EChartsOption>(() => ({
  legend: { bottom: 0, icon: 'circle' },
  series: [
    {
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['50%', '43%'],
      label: { show: false },
      data: performance.value.total
        ? segments.value.map(item => ({
            name: item.name,
            value: Number(item.value.toFixed(2)),
            itemStyle: { color: item.color },
          }))
        : files.value.map(file => ({
            name: file.filename,
            value: Number(file.duration.toFixed(2)),
          })),
    },
  ],
}))
const rankingChart = computed<EChartsOption>(() => ({
  grid: {
    left: 8,
    right: 52,
    top: 8,
    bottom: 24,
    containLabel: true,
  },
  xAxis: {
    type: 'value',
    axisLabel: { formatter: '{value} ms' },
    splitLine: {
      lineStyle: { opacity: 0.15 },
    },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: sorted.value.slice(0, 10).map(item => item.name),
    axisLabel: { width: 170, overflow: 'truncate' },
    axisTick: { show: false },
    axisLine: { show: false },
  },
  series: [
    {
      name: '耗时（ms）',
      type: 'bar',
      data: sorted.value.slice(0, 10).map(item => Number(item.value.toFixed(2))),
      barMaxWidth: 15,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
      },
      label: { show: true, position: 'right', formatter: '{c}' },
    },
  ],
}))
function selectRanking(event: ECElementEvent) {
  const item = sorted.value[event.dataIndex]!
  navigate(item.name, item.filename)
  void router.push(tab.value === 'files'
    ? { name: 'experiment' }
    : {
        name: 'rules',
        query: tab.value === 'plugins'
          ? { plugin: item.name }
          : { rule: item.name },
      })
}
function navigate(name: string, filename?: string) {
  if (tab.value === 'files') {
    experiment.selectFile(name)
  }
  else if (tab.value === 'rules' || tab.value === 'tasks') {
    if (filename)
      experiment.selectFile(filename)
    config.selectedRule = name
  }
}
</script>

<template>
  <section class="stats-page">
    <div class="stats-heading">
      <div>
        <h2><span class="i-lucide-chart-no-axes-combined" aria-hidden="true" />检查性能与规则分布</h2>
        <p>对当前{{ Object.keys(experiment.imported).length ? '导入工作区' : '沙箱示例工作区' }}运行检查，查看启动、检查和各条规则的耗时。</p>
      </div>
      <button class="btn primary" :disabled="experiment.running || experiment.preparing || !Object.keys(experiment.supportedFiles).length" @click="experiment.run('stats')">
        <span class="i-lucide-timer" aria-hidden="true" />运行工作区性能分析
      </button>
      <button v-if="experiment.running" class="btn" @click="experiment.cancel">
        取消
      </button>
    </div>
    <p v-if="experiment.error" role="alert" class="notice error">
      {{ experiment.error }}
    </p>
    <p v-if="experiment.performanceStale" class="notice">
      输入已变化，下列结果属于之前的执行，重新分析后更新。
    </p>
    <template v-if="experiment.performanceRun">
      <div class="metric-grid performance-cards" role="group" aria-label="性能摘要">
        <div><span class="metric-icon"><span class="i-lucide-files" aria-hidden="true" /></span><strong>{{ files.filter(file => !file.ignored).length }}</strong><span>已检查文件</span></div>
        <div><span class="metric-icon"><span class="i-lucide-timer" aria-hidden="true" /></span><strong>{{ (experiment.performanceRun.result.duration / 1000).toFixed(2) }} s</strong><span>执行器总耗时</span></div>
        <div><span class="metric-icon"><span class="i-lucide-circle-x" aria-hidden="true" /></span><strong>{{ errors }}</strong><span>错误</span></div>
        <div><span class="metric-icon"><span class="i-lucide-triangle-alert" aria-hidden="true" /></span><strong>{{ warnings }}</strong><span>警告</span></div>
      </div>
      <div class="performance-summary">
        <strong>检查 {{ files.filter(file => !file.ignored).length }} 个文件</strong>
        <span>{{ (experiment.performanceRun.result.duration / 1000).toFixed(2) }} s 执行器总耗时</span>
        <span>{{ performance.total ? `${(performance.total / 1000).toFixed(2)} s 引擎总检查时间` : '此工具未提供细分耗时' }}</span>
        <span class="error-count">{{ errors }} 个错误，{{ warnings }} 个警告</span>
      </div>
      <div class="performance-charts">
        <section class="panel">
          <div class="section-heading">
            <h3>{{ performance.total ? '引擎耗时分布' : '文件执行耗时占比' }}</h3><span class="tag">毫秒</span>
          </div><Chart type="pie" :dark="dark" :option="timingChart" label="执行耗时分布图" /><p class="scope-note">
            {{ performance.total ? '使用引擎正式 stats 的解析、规则、修复与其他耗时。' : '当前引擎未提供逐规则统计，按文件执行器耗时展示。' }}
          </p>
        </section>
        <section class="panel">
          <div class="section-heading">
            <h3>耗时排行 Top 10</h3><span class="tag">{{ { rules: '规则', plugins: '插件', files: '文件', tasks: '任务' }[tab] }}</span>
          </div><Chart v-if="sorted.length" type="bar" :dark="dark" :option="rankingChart" label="当前维度耗时排行图" @select="selectRanking" /><p v-else class="empty">
            当前引擎未提供这个维度的细分数据，可切换到慢文件。
          </p><p class="scope-note">
            点击条形图可打开对应明细；完整数据保留在下方排行中。
          </p>
        </section>
      </div>
      <template v-if="performance.total">
        <div class="stacked" aria-label="引擎耗时分布">
          <Hint v-for="item in segments" :key="item.name" :style="{ width: `${item.value / performance.total * 100}%`, background: item.color }" :text="`${item.name} ${item.value.toFixed(2)} ms`" />
        </div>
        <div class="legend">
          <span v-for="item in segments" :key="item.name">
            <i :style="{ background: item.color }" />{{ item.name }} <strong>{{ item.value.toFixed(1) }} ms</strong> {{ (item.value / performance.total * 100).toFixed(1) }}%</span>
        </div>
      </template>
      <ToggleGroupRoot type="single" :model-value="tab" class="ranking-tabs" aria-label="性能排行维度" @update:model-value="$event && (tab = String($event))">
        <ToggleGroupItem v-for="item in [{ key: 'rules', label: '慢规则', icon: 'i-lucide-list' }, { key: 'plugins', label: '慢插件', icon: 'i-lucide-plug' }, { key: 'files', label: '慢文件', icon: 'i-lucide-files' }, { key: 'tasks', label: '慢任务', icon: 'i-lucide-timer' }]" :key="item.key" :class="{ active: tab === item.key }" :value="item.key">
          <span :class="item.icon" aria-hidden="true" />{{ item.label }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
      <p class="ranking-scope">
        {{ tab === 'files' ? '以各文件的正式引擎总时间为基准；未提供时使用该文件执行器耗时。' : '以引擎返回的全部规则耗时之和为百分比基准。慢任务保留文件与执行轮次。' }}
      </p>
      <div v-if="sorted.length" class="ranking-controls">
        <label for="ranking-query"><span class="i-lucide-search" aria-hidden="true" /><input id="ranking-query" v-model="rankingQuery" type="search" aria-label="筛选性能排行" placeholder="搜索规则、插件或文件…"></label>
        <span>显示 {{ Math.min(rankingLimit, filteredRankings.length) }} / {{ filteredRankings.length }} 项，按耗时降序</span>
      </div>
      <div v-if="sorted.length" class="rankings">
        <RouterLink v-for="(item, index) in filteredRankings.slice(0, rankingLimit)" :key="`${item.name}/${item.detail}/${index}`" :to="tab === 'files' ? { name: 'experiment' } : tab === 'plugins' ? { name: 'rules', query: { plugin: item.name } } : { name: 'rules', query: { rule: item.name } }" class="ranking" @click="navigate(item.name, item.filename)">
          <i :style="{ width: `${item.value / maximum * 100}%`, background: `hsl(${(index * 37 + 235) % 360} 40% 88%)` }" />
          <div>
            <code>{{ item.name }}</code>
            <span class="task-file">{{ item.detail }}</span>
            <span class="percentage">{{ denominator ? (item.value / denominator * 100).toFixed(1) : '0' }}%</span>
            <strong>{{ item.value.toFixed(2) }} ms</strong>
          </div>
        </RouterLink>
      </div>
      <button v-if="filteredRankings.length > rankingLimit" class="btn mt-4" @click="rankingLimit += 30">
        <span class="i-lucide-list-plus" aria-hidden="true" />再显示 30 项
      </button>
      <p v-if="sorted.length && !filteredRankings.length" class="notice">
        没有匹配的性能记录。<button class="text-link" @click="rankingQuery = ''">
          清除排行搜索
        </button>
      </p>
      <p v-if="!sorted.length" class="notice">
        当前执行没有提供此维度的性能数据。{{ config.mode !== 'eslint' ? 'Stylelint 与 Markdownlint 不伪造逐规则、插件或任务耗时。' : '请运行工作区性能分析以取得正式 stats。' }}
      </p>
    </template>
    <p v-else class="notice">
      尚未执行性能分析，不展示示例时间或模拟排行。当前工作区共 {{ Object.keys(experiment.supportedFiles).length }} 个受支持文件。
    </p>
    <CollapsibleRoot class="distribution">
      <CollapsibleTrigger class="disclosure-trigger">
        规则分布（{{ config.resolvedCurrent ? '当前文件实际解析' : '默认配置' }}）
      </CollapsibleTrigger>
      <CollapsibleContent class="distribution-grid">
        <section>
          <h3><span class="i-lucide-plug" aria-hidden="true" />插件 / 规则数</h3>
          <RouterLink v-for="[name, count] in distribution" :key="name" :to="{ name: 'rules', query: { plugin: name } }">
            <code>{{ name }}</code>
            <span>{{ count }}</span>
          </RouterLink>
        </section>
        <section>
          <h3><span class="i-lucide-list-checks" aria-hidden="true" />规则状态</h3>
          <p>已配置：{{ config.rules.filter(rule => rule.configured).length }}</p>
          <p>启用：{{ config.rules.filter(rule => rule.configured && rule.status !== 'off').length }}</p>
          <p>可修复：{{ config.rules.filter(rule => rule.fixable).length }}</p>
          <p>推荐：{{ config.rules.filter(rule => rule.recommended).length }}</p>
          <p>已废弃：{{ config.rules.filter(rule => rule.deprecated).length }}</p>
        </section>
      </CollapsibleContent>
    </CollapsibleRoot>
  </section>
</template>

<style scoped lang="scss">
.performance-charts {
display:grid;
grid-template-columns:minmax(0,.85fr) minmax(0,1.4fr);
gap:20px;
margin:20px 0;
}

.stats-heading {
padding:22px;
margin-bottom:20px;
background:var(--surface);
border:1px solid var(--line);
border-radius:12px;
}

.performance-cards strong {
font-size:25px;
}

.ranking-tabs,.ranking-controls,.rankings,.distribution {
background:var(--surface);
}

.rankings {
padding:16px;
border:1px solid var(--line);
border-radius:10px;
}

@media(width <=800px) {
.performance-charts {
grid-template-columns:minmax(0,1fr);
} }

.stats-page{
padding:0;
}

.ranking-controls {
display:flex;
flex-wrap:wrap;
gap:12px;
align-items:center;
justify-content:space-between;
margin:14px 0;
font-size:11px;
color:var(--muted);

label {
display:flex;
flex:1;
gap:8px;
align-items:center;
min-width:180px;
}

input {
width:100%;
padding:8px;
border:1px solid var(--line);
border-radius:5px;
}
}

.stats-heading{
display:flex;
gap:12px;
align-items:center;

>div{
flex:1;
}

h2{
font-size:15px;
}

p{
margin-top:10px;
font-size:12px;
line-height:1.8;
color:var(--muted);
}
}

.performance-summary{
display:flex;
flex-wrap:wrap;
gap:20px;
margin:26px 0 18px;
font-size:12px;
color:var(--muted);

strong{
font-weight:500;
color:var(--text);
}

.error-count{
color:var(--danger);
}
}

.stacked{
display:flex;
height:16px;
overflow:hidden;
background:var(--page);
border-radius:4px;
}

.legend{
display:flex;
flex-wrap:wrap;
gap:20px;
margin:12px 0 30px;
font-size:11px;
color:var(--muted);

>span{
display:flex;
gap:6px;
align-items:center;

i{
width:9px;
height:9px;
border-radius:2px;
}

strong{
font-family:var(--font-mono);
font-weight:400;
}
}
}

.ranking-tabs{
display:inline-flex;
padding:3px;
margin-top:15px;
background:var(--soft);
border:1px solid var(--line);
border-radius:6px;

button{
display:flex;
gap:7px;
align-items:center;
padding:9px 12px;
font-size:12px;
color:var(--muted);

&.active{
color:var(--accent);
background:var(--page);
border-radius:4px;
}
}
}

.ranking-scope{
margin:13px 0 20px;
font-size:11px;
line-height:1.9;
color:var(--muted);
}

.rankings{
display:grid;
gap:7px;
}

.ranking{
position:relative;
min-height:33px;
overflow:hidden;
border:1px solid var(--line);
border-radius:4px;

>i{
position:absolute;
top:0;
left:0;
height:100%;
opacity:.16;
}

>div{
position:relative;
display:flex;
gap:15px;
align-items:center;
padding:8px 10px;
font-size:11px;
}

code{
overflow-wrap:anywhere;
}

.task-file{
font-size:10px;
color:var(--muted);
}

.percentage{
margin-left:auto;
font:10px var(--font-mono);
color:var(--muted);
}

strong{
font:11px var(--font-mono);
white-space:nowrap;
}
}

.distribution{
padding-top:20px;
margin-top:30px;
border-top:1px solid var(--line);

>.disclosure-trigger{
font-size:12px;
cursor:pointer;
}
}

.distribution-grid{
display:grid;
grid-template-columns:1fr 1fr;
gap:30px;
padding:20px 0;

section{
padding:20px;
border:1px solid var(--line);
border-radius:7px;
}

h3{
margin-bottom:15px;
}

a{
display:flex;
justify-content:space-between;
padding:9px 0;
font-size:11px;
color:var(--muted);
border-bottom:1px solid var(--line);
}

p{
font-size:12px;
line-height:2.5;
color:var(--muted);
}
}

@media(width <=650px){
.stats-heading{
flex-wrap:wrap;

>div{
min-width:100%;
}
}

.ranking-tabs{
display:flex;
flex-wrap:wrap;
}

.ranking>div{
flex-wrap:wrap;
gap:7px;
}

.distribution-grid{
grid-template-columns:1fr;
}

.task-file{
width:100%;
}
}
</style>
