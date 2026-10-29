<script setup lang="ts">
import type { ConfigItem } from '../../../../types'
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import Code from '../../../components/code/index.vue'
import Hint from '../../../components/hint/index.vue'
import RuleAction from '../../../components/rule/Action.vue'
import RuleMeta from '../../../components/rule/Meta.vue'
import { useConfigStore } from '../../../stores/config/index'

const props = defineProps<{ item: ConfigItem, open: boolean }>()
// 卡片持有展开状态；批量展开命令由父页通过 key 重新建立初始值。
const expanded = shallowRef(props.open)
const config = useConfigStore()
const definitions = computed(() => new Map(config.rules.map(rule => [rule.name, rule])))
const entries = computed(() => Object.entries(props.item.rules))
const options = computed(() => Object.keys(props.item.languageOptions ?? {}).length + Object.keys(props.item.linterOptions ?? {}).length + Object.keys(props.item.settings ?? {}).length + Number(!!props.item.language) + Number(!!props.item.processor))
function severity(value: unknown) {
  const primary = Array.isArray(value)
    ? value[0]
    : value
  return primary === 0 || primary === false || primary === null || primary === 'off'
    ? 'off'
    : primary === 1 || primary === 'warn' || (Array.isArray(value) && value[1]?.severity === 'warning')
      ? 'warn'
      : 'error'
}
</script>

<template>
  <CollapsibleRoot :id="`config-${item.index}`" v-model:open="expanded" class="configuration">
    <div class="config-summary">
      <CollapsibleTrigger class="disclosure-trigger">
        <span class="ordinal">#{{ item.index }}</span>
        <span class="i-lucide-chevron-right chevron" aria-hidden="true" />
        <span class="config-name">
          <template v-for="(segment, index) in item.name.split('/')" :key="index">
            <span :class="{ namespace: index === 0 }">{{ segment }}</span>
            <span v-if="index < item.name.split('/').length - 1" class="slash">/</span>
          </template>
        </span>
      </CollapsibleTrigger>
      <span class="counts">
        <span :class="{ present: item.files.length }"><span class="i-lucide-file-search" aria-hidden="true" /><span class="count-label">文件条件</span><b>{{ item.files.length }}</b></span>
        <span :class="{ present: item.ignores.length }"><span class="i-lucide-eye-off" aria-hidden="true" /><span class="count-label">忽略条件</span><b>{{ item.ignores.length }}</b></span>
        <span :class="{ present: options }"><span class="i-lucide-sliders-horizontal" aria-hidden="true" /><span class="count-label">选项</span><b>{{ options }}</b></span>
        <span :class="{ present: item.plugins?.length }"><span class="i-lucide-plug" aria-hidden="true" /><span class="count-label">插件</span><b>{{ item.plugins?.length ?? 0 }}</b></span>
        <span :class="{ present: entries.length }"><span class="i-lucide-list" aria-hidden="true" /><span class="count-label">规则</span><b>{{ entries.length }}</b></span>
      </span>
    </div>
    <CollapsibleContent class="config-body">
      <span class="watermark" aria-hidden="true">#{{ item.index }}</span>
      <section class="config-block">
        <h3>
          <span class="i-lucide-files" aria-hidden="true" />{{ item.files.length ? '文件匹配条件' : '未声明局部 files 条件' }}
        </h3>
        <div v-if="item.files.length" class="patterns">
          <code v-for="(pattern, index) in item.files" :key="index">{{ typeof pattern === 'string' ? pattern : JSON.stringify(pattern) }}</code>
        </div>
        <p v-else class="explanation">
          适用范围还受全局文件选择与忽略条件约束。
        </p>
      </section>
      <section v-if="item.plugins?.length" class="config-block">
        <h3>
          <span class="i-lucide-plug" aria-hidden="true" />插件（{{ item.plugins.length }}）
        </h3>
        <div class="plugin-tags">
          <RouterLink v-for="name in item.plugins" :key="name" :to="{ name: 'rules', query: { plugin: name } }">{{ name }}</RouterLink>
        </div>
      </section>
      <section v-if="item.ignores.length" class="config-block">
        <h3>
          <span class="i-lucide-eye-off" aria-hidden="true" />忽略条件（{{ item.ignores.length }}）
        </h3>
        <div class="patterns">
          <code v-for="(pattern, index) in item.ignores" :key="index">{{ typeof pattern === 'string' ? pattern : JSON.stringify(pattern) }}</code>
        </div>
      </section>
      <section v-if="options" class="config-block">
        <h3>
          <span class="i-lucide-sliders-horizontal" aria-hidden="true" />语言与检查选项
        </h3>
        <div class="options-grid">
          <article v-for="(value, name) in { language: item.language, processor: item.processor, languageOptions: item.languageOptions, linterOptions: item.linterOptions, settings: item.settings }" v-show="value !== undefined" :key="name">
            <h4>{{ name }}</h4>
            <Code :code="JSON.stringify(value, null, 2) ?? 'null'" :label="String(name)" />
          </article>
        </div>
      </section>
      <section v-if="entries.length" class="config-block">
        <h3>
          <span class="i-lucide-list" aria-hidden="true" />规则（{{ entries.length }}）
        </h3>
        <div class="rule-columns" aria-hidden="true">
          <span>规则</span><span>说明</span><span>属性</span>
        </div>
        <div class="rule-declarations">
          <article v-for="[name, value] in entries" :key="name">
            <div class="rule-identity">
              <Hint class="level" :class="severity(value)" :text="`本项声明 ${severity(value)}`">
                <span :class="severity(value) === 'off' ? 'i-lucide-ban' : severity(value) === 'warn' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-alert'" aria-hidden="true" />
              </Hint>
              <RuleAction :name="name" :value="value" :rule="definitions.get(name)" :level="severity(value)" />
            </div><p class="rule-description">
              {{ definitions.get(name)?.description || '上游未提供规则说明' }}
            </p><RuleMeta class="rule-attributes" :rule="definitions.get(name)" />
          </article>
        </div>
      </section>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>

<style scoped lang="scss">
.configuration{
margin:11px 0;
scroll-margin-top:20px;
background:var(--surface);
border:1px solid var(--line);
border-radius:7px;

.disclosure-trigger {
display:flex;
flex:1;
gap:12px;
align-items:center;
min-width:0;
text-align:left;
}

>.config-summary{
display:flex;
gap:12px;
align-items:center;
min-height:47px;
padding:10px 14px;
cursor:pointer;
list-style:none;
background:var(--soft);
border-radius:7px;

}

.ordinal{
min-width:24px;
font:11px var(--font-mono);
color:var(--muted);

}

.chevron{
width:13px;
height:13px;
color:var(--muted);
transition:transform .15s;

}

 &[data-state="open"]>.config-summary{
border-bottom:1px solid var(--line);

}

 &[data-state="open"]>.config-summary .chevron{
transform:rotate(90deg);

}

 }

.config-name{
display:flex;
flex:1;
flex-wrap:wrap;
gap:4px;
align-items:center;
font:12px var(--font-mono);
overflow-wrap:anywhere;

}

.namespace{
color:var(--success);

}

.slash{
color:var(--muted);

}

.counts{
display:flex;
flex-wrap:wrap;
gap:8px 12px;
align-items:center;
justify-content:flex-end;

>span{
display:flex;
gap:6px;
align-items:center;
min-width:44px;
color:var(--muted);

[class*='i-']{
width:14px;
height:14px;

}

b{
font-size:11px;
font-weight:500;

}

&.present{
color:var(--accent);

}

&:nth-child(2).present{
color:var(--purple);

}

&:nth-child(3).present{
color:var(--success);

}

&:nth-child(4).present{
color:var(--teal);

}

}

}

.count-label {
font-size:10px;
white-space:nowrap;
}

.config-body{
position:relative;
padding:22px 24px;
border-top:1px solid var(--line);

}

.watermark{
position:absolute;
top:5px;
right:18px;
font:72px var(--font-mono);
color:var(--line);
pointer-events:none;
opacity:.45;

}

.config-block{
position:relative;
max-width:100%;
margin-bottom:25px;

h3{
display:flex;
gap:9px;
align-items:center;
margin-bottom:13px;
font-size:13px;

[class*='i-']{
width:15px;
height:15px;
color:var(--muted);

}

}

&:last-child{
margin-bottom:0;

}

}

.explanation{
margin-left:24px;
font-size:11px;
color:var(--muted);

}

.patterns{
display:flex;
flex-wrap:wrap;
gap:7px;
padding-left:24px;

code{
padding:5px 8px;
font-size:11px;
color:var(--muted);
overflow-wrap:anywhere;
background:var(--page);
border:1px solid var(--line);
border-radius:4px;

}

}

.plugin-tags{
display:flex;
flex-wrap:wrap;
gap:8px;
padding-left:24px;

a{
padding:5px 11px;
font:12px var(--font-mono);
color:#286747;
background:#eaf4f0;
border-radius:15px;

}

}

.options-grid{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
gap:12px;
padding-left:24px;

article{
min-width:0;
padding:14px;
background:var(--soft);
border:1px solid var(--line);
border-radius:6px;

}

h4{
margin-bottom:10px;
font:12px var(--font-mono);
color:var(--muted);

}

pre{
max-height:300px;
overflow:auto;
font-size:11px;
line-height:1.8;

}

}

.rule-columns,.rule-declarations > article {
  display:grid;
  grid-template-columns:minmax(200px,.9fr) minmax(220px,1.5fr) 170px;
  gap:16px;
  align-items:center;
}

.rule-columns {
padding:8px 0;
font-size:10px;
color:var(--muted);
}

.rule-columns > :last-child {
text-align:right;
}

.rule-declarations > article {
padding:12px 0;
border-top:1px solid var(--line);
}

.rule-description {
margin:0;
font-size:12px;
line-height:1.7;
color:var(--muted);
}

.rule-attributes {
grid-column:3;
justify-self:end;
}

.rule-name {
color:var(--accent);
text-align:left;
}

.rule-identity {
display:flex;
gap:9px;
align-items:center;
min-width:0;
}

.rule-identity code {
font-size:12px;
overflow-wrap:anywhere;
}

.level {
display:grid;
flex-shrink:0;
place-items:center;
width:17px;
height:17px;
border-radius:50%;
}

.level.error {
color:var(--danger);
}

.level.warn {
color:var(--warning);
}

.level.off {
color:var(--muted);
}

@media(width <=950px) {
  .counts {
gap:7px;
}

  .counts > span {
min-width:28px;
}

  .rule-columns {
display:none;
}

  .rule-declarations > article {
grid-template-columns:minmax(0,1fr) 170px;
gap:8px;
}

  .rule-identity {
grid-row:1;
grid-column:1;
}

  .rule-attributes {
grid-row:1;
grid-column:2;
}

  .rule-description {
grid-row:2;
grid-column:1/-1;
}
}

@media(width <=600px) {
  .configuration > .config-summary {
flex-wrap:wrap;
gap:7px;
padding:12px;
}

  .counts {
justify-content:space-between;
width:100%;
padding-left:42px;
}

  .config-name {
font-size:11px;
}

  .config-body {
padding:18px 13px;
}

  .options-grid,.patterns {
padding-left:0;
}
}
</style>
