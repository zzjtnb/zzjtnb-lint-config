<script setup lang="ts">
// 全量配置／规则到文件的匹配关系；所选文件只提供定位与原文，不过滤目录。
import type { SandboxResult } from '../../../../protocol'
import type { ConfigItem } from '../../../../types'
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Scroll from '../../../components/scroll/index.vue'
import { useConfigStore } from '../../../stores/index'

const props = defineProps<{
  path: string
  file?: NonNullable<SandboxResult['workspace']>[number]
  configs: ConfigItem[]
  workspace: NonNullable<SandboxResult['workspace']>
  stale: boolean
  unsupported: boolean
  imported: boolean
  source?: string
}>()
const emit = defineEmits<{ experiment: [], copy: [], selectFile: [path: string] }>()
const config = useConfigStore()
const tab = ref('configs')
const query = ref('')
const page = ref(1)
const configMatchesKnown = computed(() => props.workspace.length > 0 && props.workspace.every(file => file.ignored || file.matchedConfigs !== undefined))
const configFiles = computed(() => new Map(props.configs.map(item => [
  item.index,
  props.workspace.filter(file => !file.ignored && file.matchedConfigs?.includes(item.index)),
])))
const ruleFiles = computed(() => {
  const result = new Map<string, typeof props.workspace>()
  for (const file of props.workspace) {
    if (file.ignored)
      continue
    for (const name of Object.keys(file.rules)) {
      const files = result.get(name) ?? []
      files.push(file)
      result.set(name, files)
    }
  }
  return result
})
const catalog = computed(() => {
  const definitions = new Map(config.catalog.map(rule => [rule.name, rule.description]))
  for (const item of props.configs) {
    for (const name of Object.keys(item.rules)) {
      if (!definitions.has(name))
        definitions.set(name, '')
    }
  }
  for (const name of [
    ...ruleFiles.value.keys(),
    ...Object.keys(config.draft.overrides),
  ]) {
    if (!definitions.has(name))
      definitions.set(name, '')
  }
  return [...definitions].map(([name, description]) => ({ name, description }))
})
const rules = computed(() => catalog.value.filter(rule => `${rule.name} ${rule.description}`.toLowerCase().includes(query.value.trim().toLowerCase())))
function level(value: unknown) {
  const primary = Array.isArray(value)
    ? value[0]
    : value
  if (primary == null || primary === false || primary === 0 || primary === 'off')
    return 'off'
  if (primary === 1 || primary === 'warn' || (Array.isArray(value) && value[1]?.severity === 'warning'))
    return 'warn'
  return 'error'
}
watch(query, () => {
  page.value = 1
})
watch(() => config.mode, () => {
  query.value = ''
  page.value = 1
  tab.value = 'configs'
})
</script>

<template>
  <section class="file-detail" aria-label="文件匹配详情">
    <header class="file-detail-heading">
      <div><span class="i-lucide-file-code-2" aria-hidden="true" /><h2>配置与规则匹配</h2></div><div class="detail-actions">
        <button class="btn" @click="emit('copy')">
          <span class="i-lucide-copy" aria-hidden="true" />复制路径
        </button><button class="btn" :disabled="unsupported" @click="emit('experiment')">
          使用此文件实验 →
        </button>
      </div>
    </header>
    <div class="file-detail-status">
      <code class="current-file" aria-label="当前定位文件">{{ path }}</code><span class="tag" :class="unsupported || file?.ignored ? 'amber' : file ? 'green' : ''">{{ unsupported ? '当前工具不支持' : file ? file.ignored ? '被忽略或未包含' : '包含' : '待解析' }}</span><span>{{ imported ? '导入文件' : '沙箱示例' }}</span><template v-if="file">
        <span>{{ file.matchedConfigs?.length ?? '·' }} 项配置匹配</span><span>{{ Object.keys(file.rules).length }} 条最终规则</span>
      </template>
    </div>
    <TabsRoot v-model="tab" class="file-detail-tabs">
      <TabsList class="detail-tab-list" aria-label="文件详情内容">
        <TabsTrigger value="configs">
          全部配置 <span class="tag">{{ configs.length }}</span>
        </TabsTrigger><TabsTrigger value="rules">
          全部规则 <span class="tag">{{ catalog.length }}</span>
        </TabsTrigger><TabsTrigger value="source">
          文件信息
        </TabsTrigger>
      </TabsList>
      <TabsContent value="configs" class="detail-tab-panel">
        <Scroll label="完整配置与匹配文件">
          <div class="detail-content">
            <p class="hint">
              完整配置列表不随当前文件删减。展开配置查看匹配文件；当前定位文件以选中态标注。
            </p><p v-if="!workspace.length" class="notice">
              尚未解析工作区，匹配文件待解析。
            </p><p v-else-if="!configMatchesKnown" class="notice">
              该引擎未公开逐项配置匹配，不将未知显示为未匹配；规则与文件关系见“全部规则”。
            </p><ol class="matched-configs">
              <li v-for="item in configs" :key="item.index">
                <CollapsibleRoot>
                  <CollapsibleTrigger class="relation-trigger" :class="{ applies: file?.matchedConfigs?.includes(item.index) }">
                    <span class="tag">#{{ item.index }}</span><code>{{ item.name }}</code><span class="match-count">{{ !workspace.length ? '尚未解析' : !configMatchesKnown ? '匹配未公开' : (stale ? '上次 ' : '') + ((configFiles.get(item.index)?.length ?? 0) ? (`${configFiles.get(item.index)!.length} 个文件`) : '未匹配') }}</span><span class="i-lucide-chevron-down" aria-hidden="true" />
                  </CollapsibleTrigger><div class="glob-tags">
                    <code v-for="pattern in item.files" :key="JSON.stringify(pattern)">{{ pattern }}</code>
                  </div><CollapsibleContent class="relation-files">
                    <p v-if="!workspace.length" class="hint">
                      解析后展示此配置匹配的文件。
                    </p><p v-else-if="!configMatchesKnown" class="hint">
                      引擎没有提供逐项匹配证据。
                    </p><p v-else-if="!configFiles.get(item.index)?.length" class="hint">
                      {{ stale ? '上次解析中没有匹配文件。' : '当前工作区没有匹配此配置的文件。' }}
                    </p><button v-for="matched in configFiles.get(item.index) ?? []" :key="matched.filename" class="matched-file" :class="{ current: matched.filename === path }" @click="emit('selectFile', matched.filename)">
                      <span class="i-lucide-file-code-2" aria-hidden="true" /><code>{{ matched.filename }}</code>
                    </button><RouterLink class="text-link" :to="{ name: 'overview' }" @click="config.selectedConfig = item.index">查看完整配置 →</RouterLink><p v-if="item.ignores.length" class="hint">
                      忽略条件：{{ item.ignores.join('，') }}
                    </p><span class="hint">本项声明 {{ Object.keys(item.rules).length }} 条规则</span>
                  </CollapsibleContent>
                </CollapsibleRoot>
              </li>
            </ol><p v-if="!configs.length" class="empty">
              {{ config.loading ? '正在读取完整配置目录…' : '没有可展示的配置项。' }}
            </p>
          </div>
        </Scroll>
      </TabsContent>
      <TabsContent value="rules" class="detail-tab-panel rules-panel">
        <div class="rule-search">
          <input v-model="query" class="search-input" aria-label="筛选完整规则目录" placeholder="搜索全部规则名称或说明…"><span>{{ rules.length }} / {{ catalog.length }} 条</span>
        </div><Scroll label="完整规则与匹配文件">
          <div class="final-rules">
            <p class="hint">
              完整规则目录包含未配置与关闭的规则。展开规则查看哪些文件配置了它，以及各文件的实际值。
            </p><CollapsibleRoot v-for="rule in rules.slice((page - 1) * 40, page * 40)" :key="rule.name" class="rule-relation">
              <CollapsibleTrigger class="relation-trigger" :class="{ applies: file && !file.ignored && Object.hasOwn(file.rules, rule.name) }">
                <code>{{ rule.name }}</code><span class="match-count">{{ !workspace.length ? '尚未解析' : (stale ? '上次 ' : '') + ((ruleFiles.get(rule.name)?.length ?? 0) ? `${ruleFiles.get(rule.name)!.length} 个文件` : '未匹配') }}</span><span class="i-lucide-chevron-down" aria-hidden="true" />
              </CollapsibleTrigger><CollapsibleContent class="relation-files">
                <p v-if="rule.description" class="hint">
                  {{ rule.description }}
                </p><p v-if="!workspace.length" class="hint">
                  解析后展示配置了此规则的文件。
                </p><p v-else-if="!ruleFiles.get(rule.name)?.length" class="hint">
                  {{ stale ? '上次解析中未有文件配置此规则。' : '当前工作区没有文件配置此规则。' }}
                </p><div v-for="matched in ruleFiles.get(rule.name) ?? []" :key="matched.filename" class="rule-file">
                  <button class="matched-file" :class="{ current: matched.filename === path }" @click="emit('selectFile', matched.filename)">
                    <span class="i-lucide-file-code-2" aria-hidden="true" /><code>{{ matched.filename }}</code>
                  </button><span class="tag" :class="level(matched.rules[rule.name]) === 'off' ? '' : level(matched.rules[rule.name]) === 'warn' ? 'amber' : 'red'">{{ level(matched.rules[rule.name]) === 'off' ? '关闭' : level(matched.rules[rule.name]) === 'warn' ? '警告级别' : config.mode === 'markdownlint' ? '启用' : '错误级别' }}</span><code class="matched-value">{{ JSON.stringify(matched.rules[rule.name]) }}</code>
                </div><RouterLink class="text-link" :to="{ name: 'rules', query: { rule: rule.name } }" @click="config.selectedRule = rule.name">查看与编辑规则 →</RouterLink>
              </CollapsibleContent>
            </CollapsibleRoot><p v-if="!rules.length" class="empty">
              没有符合搜索条件的规则。
            </p>
          </div>
        </Scroll><PaginationRoot v-if="rules.length > 40" v-model:page="page" :total="rules.length" :items-per-page="40" :sibling-count="1" show-edges class="file-pagination" aria-label="完整规则分页">
          <PaginationPrev class="btn" aria-label="上一页文件规则">
            上一页
          </PaginationPrev><PaginationList v-slot="{ items }" class="page-numbers">
            <template v-for="(item, index) in items" :key="index">
              <PaginationListItem v-if="item.type === 'page'" class="page-number" :value="item.value" :aria-label="`第 ${item.value} 页规则`">
                {{ item.value }}
              </PaginationListItem><PaginationEllipsis v-else :index="index">
                …
              </PaginationEllipsis>
            </template>
          </PaginationList><PaginationNext class="btn" aria-label="下一页文件规则">
            下一页
          </PaginationNext>
        </PaginationRoot>
      </TabsContent>
      <TabsContent value="source" class="detail-tab-panel">
        <Scroll label="文件原文预览">
          <div class="detail-content">
            <dl class="file-metadata">
              <dt>路径</dt><dd>{{ path }}</dd><dt>来源</dt><dd>{{ imported ? '用户明确导入' : '内置示例' }}</dd><dt>当前工具</dt><dd>{{ config.active.name }}</dd><dt>支持检查</dt><dd>{{ unsupported ? '否' : '是' }}</dd>
            </dl><h3>当前内容预览</h3><pre class="source-preview">{{ source?.split('\n').slice(0, 30).join('\n') || '没有可预览的文本内容。' }}</pre><p class="hint">
              最多预览 30 行；完整编辑与检查位于代码实验。
            </p>
          </div>
        </Scroll>
      </TabsContent>
    </TabsRoot>
  </section>
</template>

<style scoped lang="scss">
.file-detail {
display:flex;
flex-direction:column;
height:100%;
min-height:0;
}

.file-detail-heading {
display:flex;
flex-wrap:wrap;
gap:12px;
align-items:center;
justify-content:space-between;
padding:16px 20px 10px;
}

.file-detail-heading > div,.detail-actions {
display:flex;
gap:9px;
align-items:center;
min-width:0;
}

.file-detail-heading h2 {
font-size:14px;
font-weight:600;
overflow-wrap:anywhere;
}

.current-file { overflow-wrap:anywhere; }

.file-detail-status {
display:flex;
flex-wrap:wrap;
gap:12px;
align-items:center;
padding:0 20px 14px;
font-size:11px;
color:var(--muted);
}

.file-detail-tabs {
display:flex;
flex:1;
flex-direction:column;
min-height:0;
}

.detail-tab-list {
display:flex;
gap:16px;
padding:0 20px;
border-bottom:1px solid var(--line);
}

.detail-tab-list button {
display:flex;
gap:6px;
align-items:center;
padding:10px 2px;
font-size:12px;
color:var(--muted);
border-bottom:2px solid transparent;
}

.detail-tab-list button[data-state='active'] {
color:var(--accent);
border-bottom-color:var(--accent);
}

.detail-tab-panel {
flex:1;
min-height:0;
}

.rules-panel[data-state='active'] {
display:flex;
flex-direction:column;
}

.rules-panel > .scroll-area {
flex:1;
height:0;
}

.detail-content {
padding:18px 20px;
}

.matched-configs {
display:grid;
gap:14px;
padding:0;
margin:0;
list-style:none;
}

.matched-configs li {
padding:14px;
border:1px solid var(--line);
border-radius:7px;
}

.matched-configs a {
display:flex;
gap:9px;
align-items:center;
color:var(--accent);
}

.matched-configs a code {
flex:1;
overflow-wrap:anywhere;
}

.glob-tags {
display:flex;
flex-wrap:wrap;
gap:5px;
margin:10px 0;
}

.glob-tags code {
padding:3px 5px;
font-size:11px;
background:var(--well);
border-radius:4px;
}

.rule-search {
display:flex;
flex-shrink:0;
gap:10px;
align-items:center;
padding:12px 20px;
font-size:11px;
color:var(--muted);
border-bottom:1px solid var(--line);
}

.rule-search input {
flex:1;
min-width:0;
}

.final-rules {
padding:0 20px;
}

.final-rules code {
overflow-wrap:anywhere;
white-space:pre-wrap;
}

.rule-relation {
border-bottom:1px solid var(--line);
}

.relation-trigger {
display:flex;
gap:8px;
align-items:center;
width:100%;
padding:12px 4px;
font-size:12px;
text-align:left;
}

.relation-trigger code {
flex:1;
min-width:0;
overflow-wrap:anywhere;
}

.relation-trigger.applies {
color:var(--accent);
}

.match-count {
flex-shrink:0;
margin-left:auto;
font-size:11px;
color:var(--muted);
}

.relation-files {
padding:4px 8px 14px;
}

.relation-files > .hint {
margin:8px 0;
}

.matched-file {
display:flex;
gap:7px;
align-items:center;
min-width:0;
padding:7px 4px;
font-size:12px;
text-align:left;
border-radius:4px;
}

.matched-file code {
overflow-wrap:anywhere;
}

.matched-file.current {
color:var(--accent);
background:var(--brand-soft);
}

.rule-file {
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
padding:5px 0;
}

.rule-file .matched-file {
flex:1 1 200px;
}

.matched-value {
flex:1 1 180px;
font-size:11px;
color:var(--muted);
}

.file-pagination,.page-numbers {
display:flex;
gap:4px;
align-items:center;
justify-content:center;
}

.file-pagination {
flex-wrap:wrap;
padding:10px;
border-top:1px solid var(--line);
}

.page-number {
min-width:28px;
padding:5px;
font-size:12px;
border-radius:4px;
}

.page-number[data-selected] {
color:var(--accent);
background:var(--brand-soft);
}

.file-metadata {
display:grid;
grid-template-columns:80px 1fr;
gap:10px;
margin:0 0 24px;
font-size:12px;
}

.file-metadata dt {
color:var(--muted);
}

.file-metadata dd {
margin:0;
overflow-wrap:anywhere;
}

.source-preview {
padding:14px;
margin-top:12px;
overflow:auto;
font-size:12px;
line-height:1.7;
background:var(--well);
border-radius:6px;
}

@media(width <=700px) { .file-detail-heading {
padding:12px;
}

 .file-detail-status,.detail-tab-list {
padding-right:12px;
padding-left:12px;
}

 .detail-content {
padding:12px;
}
}
</style>
