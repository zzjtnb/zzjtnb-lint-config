<script setup lang="ts">
import type { RuleItem } from '../../../../types'
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Code from '../../../components/code/index.vue'
import RuleMeta from '../../../components/rule/Meta.vue'
import { useConfigStore } from '../../../stores/config/index'

const props = defineProps<{
  rule: RuleItem
}>()
const config = useConfigStore()
const pending = reactive<Record<string, string>>({})
const key = computed(() => `${config.mode}/${props.rule.name}`)
const value = computed({
  get: () => pending[key.value] ?? JSON.stringify(Object.hasOwn(config.draft.overrides, props.rule.name)
    ? config.draft.overrides[props.rule.name]
    : JSON.parse(props.rule.value), null, 2),
  set: (value) => { pending[key.value] = value },
})
const error = ref('')
const overrideLevel = computed(() => {
  const value = config.draft.overrides[props.rule.name]
  if (value === undefined)
    return 'inherit'
  const primary = Array.isArray(value)
    ? value[0]
    : value
  if (primary == null || primary === false || primary === 0 || primary === 'off')
    return 'off'
  if (primary === 1 || primary === 'warn' || (Array.isArray(value) && value[1]?.severity === 'warning'))
    return 'warn'
  return 'error'
})
watch(key, () => {
  error.value = ''
})
function save() {
  try {
    config.setOverride(props.rule.name, JSON.parse(value.value))
    error.value = ''
  }
  catch {
    error.value = 'JSON 格式无效，未覆盖已有配置，请修正输入'
  }
}
function setLevel(next: string) {
  if (next === 'inherit') {
    config.inherit(props.rule.name)
    delete pending[key.value]
    error.value = ''
    return
  }
  let base: unknown
  try {
    base = JSON.parse(value.value || 'null')
  }
  catch {
    error.value = 'JSON 格式无效，请先修正参数再切换级别'
    return
  }
  try {
    config.changeLevel(props.rule.name, base, next as 'off' | 'warn' | 'error')
    value.value = JSON.stringify(config.draft.overrides[props.rule.name], null, 2)
    error.value = ''
  }
  catch (cause) {
    error.value = cause instanceof Error
      ? cause.message
      : String(cause)
  }
}
</script>

<template>
  <aside class="rule-detail">
    <div class="detail-eyebrow">
      规则详情 <a v-if="rule.url" :href="rule.url" target="_blank" rel="noreferrer"><span class="i-lucide-external-link" aria-hidden="true" />官方文档</a>
    </div>
    <h2>{{ rule.name }}</h2>
    <p class="rule-description">
      {{ rule.description || '上游未提供规则说明' }}
    </p>
    <div class="flex gap-2 flex-wrap">
      <span class="tag blue">{{ rule.category }}</span>
      <RuleMeta :rule="rule" />
    </div>
    <section>
      <h3>{{ config.resolvedCurrent ? '当前文件生效配置' : '共享配置中的值' }}</h3>
      <p class="hint">
        {{ config.resolvedCurrent ? `当前文件：${config.draft.filename}` : `默认示例：${config.metadata?.filename ?? rule.files}` }}
      </p>
      <Code v-if="rule.configured" :code="JSON.stringify(JSON.parse(rule.value), null, 2)" label="共享或当前文件的配置值" /><p v-else class="hint">
        未配置
      </p>
    </section>
    <section aria-label="规则默认参数">
      <h3>规则默认参数</h3><Code v-if="rule.defaultOptions !== undefined" :code="JSON.stringify(rule.defaultOptions, null, 2)" label="规则默认参数值" /><p v-else class="hint">
        上游没有提供可展示的默认参数，可查看官方文档。
      </p><p v-if="rule.defaultOptions !== undefined" class="hint">
        参数默认值不包含启用级别，与共享配置中的值分别展示。
      </p>
    </section>
    <section>
      <h3>我的覆盖</h3>
      <ToggleGroupRoot type="single" :model-value="overrideLevel" class="levels" aria-label="规则覆盖级别" @update:model-value="$event && setLevel(String($event))">
        <ToggleGroupItem value="inherit" data-level="inherit">
          <span class="i-lucide-git-merge" aria-hidden="true" />继承
        </ToggleGroupItem><ToggleGroupItem value="off" data-level="off">
          <span class="i-lucide-ban" aria-hidden="true" />关闭
        </ToggleGroupItem><ToggleGroupItem v-if="config.mode !== 'markdownlint'" value="warn" data-level="warn">
          <span class="i-lucide-triangle-alert" aria-hidden="true" />警告
        </ToggleGroupItem><ToggleGroupItem value="error" :data-level="config.mode === 'markdownlint' ? 'enabled' : 'error'">
          <span :class="config.mode === 'markdownlint' ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'" aria-hidden="true" />{{ config.mode === 'markdownlint' ? '启用' : '错误' }}
        </ToggleGroupItem>
      </ToggleGroupRoot>
      <label for="rule-json">完整规则配置 / JSON
        <textarea id="rule-json" v-model="value" spellcheck="false" />
      </label>
      <p v-if="error" role="alert" class="field-error">
        {{ error }}
      </p>
      <button class="btn primary mt-3" @click="save">
        <span class="i-lucide-save" aria-hidden="true" />保存覆盖
      </button>
      <p class="hint">
        覆盖最后追加，不改写配置源码。修改后重新解析或检查。
      </p>
    </section>
    <section v-if="rule.schema">
      <h3>规则参数格式</h3><AccordionRoot type="multiple">
        <AccordionItem value="schema">
          <AccordionHeader>
            <AccordionTrigger class="text-link">
              参数 Schema
            </AccordionTrigger>
          </AccordionHeader><AccordionContent><Code :code="JSON.stringify(rule.schema, null, 2)" label="规则参数 Schema" /></AccordionContent>
        </AccordionItem>
      </AccordionRoot>
    </section>
    <section>
      <h3><span class="i-lucide-git-branch" aria-hidden="true" />规则的配置来源</h3>
      <p class="hint">
        下面按配置顺序列出这条规则的设置及适用文件。查看当前文件的最终值，请重新解析配置。
      </p>
      <ol v-if="rule.sources.length" class="timeline">
        <li v-for="(source, index) in rule.sources" :key="index">
          <RouterLink :to="{ name: 'overview' }" @click="config.selectedConfig = source.index">#{{ source.index }} {{ source.name }}</RouterLink>
          <Code :code="JSON.stringify(JSON.parse(source.value), null, 2)" label="来源配置的规则值" />
          <span>{{ source.files.length ? JSON.stringify(source.files) : '无局部 files 限制' }}</span><span v-if="config.resolvedCurrent && config.resolved?.matchedConfigs" class="block">{{ config.resolved.matchedConfigs.includes(source.index) ? '匹配当前文件' : '不匹配当前文件' }}</span>
        </li>
        <li v-if="Object.hasOwn(config.draft.overrides, rule.name)">
          <strong>我的覆盖 · 最后应用</strong>
          <Code :code="JSON.stringify(config.draft.overrides[rule.name], null, 2)" label="当前规则覆盖值" />
        </li>
      </ol>
      <p v-else class="hint">
        此工具未公开声明来源链，不从最终值推断。
      </p>
    </section>
    <div class="flex gap-2">
      <button class="btn" @click="config.copy(rule.name)">
        <span class="i-lucide-copy" aria-hidden="true" />复制名称
      </button>
      <RouterLink class="btn primary" :to="{ name: 'experiment' }">去代码实验 →</RouterLink>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.rule-detail {
 min-width:0;
 padding: 23px 20px;
 background: var(--surface);
 border:1px solid var(--line);
 border-radius:12px;
 }

.detail-eyebrow {
 display:flex;
 justify-content:space-between;
 font-size:10px;
 color:var(--muted);

 a {
color:var(--accent);
}
 }

h2 {
margin:15px 0 11px;
font:600 17px var(--font-mono);
overflow-wrap:anywhere;
}

.rule-description,.hint {
margin:10px 0 16px;
font-size:12px;
line-height:1.9;
color:var(--muted);
}

section {
padding-top:20px;
margin-top:23px;
border-top:1px solid var(--line);
}

h3 {
display:flex;
justify-content:space-between;
margin-bottom:13px;

span{
font-size:10px;
font-weight:400;
color:var(--warning);
}
}

pre {
padding:13px;
font-size:11px;
line-height:1.8;
background:var(--page);
border-radius:6px;
}

label{
display:block;
margin:15px 0 8px;
font-size:11px;
color:var(--muted);
}

textarea{
width:100%;
min-height:100px;
padding:10px;
font:12px/1.8 var(--font-mono)!important;
border:1px solid var(--line);
border-radius:6px;
}

.levels{
display:flex;
padding:3px;
background:var(--surface);
border:1px solid var(--line);
border-radius:6px;

button{
display:flex;
flex:1;
gap:4px;
align-items:center;
justify-content:center;
padding:6px 3px;
font-size:11px;
color:var(--muted);

&:hover{
color:var(--accent);
background:var(--page);
}
}
}

.levels button[data-state='on'] {
font-weight:600;
color:var(--accent);
background:var(--brand-soft);
border-radius:4px;
box-shadow:inset 0 0 0 1px currentcolor;
}

.levels button[data-state='on'][data-level='off'] {
color:var(--text);
background:var(--well);
}

.levels button[data-state='on'][data-level='warn'] {
color:var(--warning);
background:color-mix(in srgb,var(--warning) 10%,var(--surface));
}

.levels button[data-state='on'][data-level='error'] {
color:var(--danger);
background:color-mix(in srgb,var(--danger) 10%,var(--surface));
}

.levels button[data-state='on'][data-level='enabled'] {
color:var(--success);
background:color-mix(in srgb,var(--success) 10%,var(--surface));
}

.field-error{
font-size:11px;
color:var(--danger);
}

.timeline{
padding-left:17px;
margin:16px 0 23px 6px;
border-left:1px solid var(--line);

li{
position:relative;
margin-bottom:20px;
font-size:10px;
color:var(--muted);

&::before{
position:absolute;
top:5px;
left:-21px;
width:6px;
height:6px;
content:'';
background:#aac1df;
border-radius:50%;
}

a{
display:block;
font:11px var(--font-mono);
color:var(--accent);
}

pre{
padding:6px 0;
font-size:10px;
background:none;
}

span{
overflow-wrap:anywhere;
}
}
}
</style>
