<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Code from '../../../components/code/index.vue'
import Diff from '../../../components/diff/index.vue'
import Editor from '../../../components/editor/index.vue'
import Select from '../../../components/select/index.vue'
import { useConfigStore } from '../../../stores/config/index'

const config = useConfigStore()
const tab = ref('visual')
const showChanges = ref(false)
const comparison = computed(() => {
  try {
    return { text: config.exported, error: '' }
  }
  catch (error) {
    return {
      text: '',
      error: String(error),
    }
  }
})
const error = ref('')
const restoreRequested = ref(false)
const effective = computed(() => new Map(config.rules.map(rule => [rule.name, rule])))
const displayedRules = computed(() => Object.fromEntries([
  ...new Set([
    ...(config.selectedRule
      ? [config.selectedRule]
      : []),
    ...Object.keys(config.draft.overrides),
  ]),
].map(name => [name, config.draft.overrides[name] ?? JSON.parse(effective.value.get(name)?.value ?? 'null')])))
watch(() => config.mode, () => {
  showChanges.value = false
  restoreRequested.value = false
  error.value = ''
})
function restore() {
  restoreRequested.value = false
  config.reset()
  error.value = ''
}
function changeRule(name: string, level: string) {
  try {
    if (level === 'inherit')
      config.inherit(name)
    else config.changeLevel(name, config.draft.overrides[name] ?? JSON.parse(effective.value.get(name)?.value ?? 'null'), level as 'off' | 'warn' | 'error')
    error.value = ''
  }
  catch (cause) { error.value = String(cause) }
}
function ruleLevel(value: unknown) {
  const primary = Array.isArray(value)
    ? value[0]
    : value
  if (primary === null || primary === false || primary === 0 || primary === 'off')
    return 'off'
  if (config.mode === 'stylelint') {
    return Array.isArray(value) && value[1]?.severity === 'warning'
      ? 'warn'
      : 'error'
  }
  return primary === 1 || primary === 'warn'
    ? 'warn'
    : 'error'
}
function option(key: string, value: boolean) {
  try {
    config.setOption(key, value)
    error.value = ''
  }
  catch (cause) { error.value = String(cause) }
}
</script>

<template>
  <aside class="config-panel">
    <div class="config-heading">
      <h2>
        <span class="i-lucide-sliders-horizontal" aria-hidden="true" />当前配置
      </h2>
      <button class="btn" aria-label="恢复基础配置" @click="restoreRequested = true">
        <span class="i-lucide-rotate-ccw" aria-hidden="true" />恢复默认
      </button>
    </div>
    <TabsRoot v-model="tab">
      <TabsList class="config-tabs" aria-label="配置编辑方式">
        <TabsTrigger value="visual" :class="{ active: tab === 'visual' }">
          可视化配置
        </TabsTrigger>
        <TabsTrigger value="source" :class="{ active: tab === 'source' }">
          配置源码
        </TabsTrigger>
      </TabsList>
      <div class="config-tools">
        <span class="tag amber">{{ config.edited ? '草稿有修改' : '继承基础配置' }}</span>
      </div>
      <AlertDialogRoot v-model:open="restoreRequested">
        <AlertDialogPortal to=".workbench">
          <AlertDialogOverlay class="dialog-overlay" /><AlertDialogContent class="dialog-content">
            <AlertDialogTitle>恢复默认配置？</AlertDialogTitle><AlertDialogDescription>清除当前配置源码修改和规则覆盖，示例代码保留。</AlertDialogDescription><div class="dialog-actions">
              <AlertDialogCancel class="btn">
                保留草稿
              </AlertDialogCancel><AlertDialogAction class="btn primary" @click="restore">
                确认恢复
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialogRoot>
      <p v-if="error" role="alert" class="notice error">
        {{ error }}
      </p>
      <TabsContent value="visual" class="visual-options">
        <template v-if="config.options.length">
          <h3>语言集成</h3>
          <div v-for="item in config.options" :key="item.key" class="language-option">
            <span>{{ item.label }}<small v-if="!item.editable">请在源码编辑</small>
            </span>
            <span v-if="item.value === null" class="tag">动态或未知</span>
            <SwitchRoot v-else class="ui-switch" :aria-label="`${item.label} 语言集成`" :model-value="item.value === true" :disabled="!item.editable" @update:model-value="option(item.key, $event)">
              <SwitchThumb class="ui-switch-thumb" />
            </SwitchRoot>
          </div>
          <p v-if="config.options.some(item => !item.editable)" class="hint">
            动态表达式、展开对象或未知工厂保持原样，不以表单覆盖。
          </p>
        </template>
        <p v-else class="hint">
          更多选项请在“配置源码”中编辑。规则的可用参数可在规则详情中查看。
        </p>
        <div class="rule-heading">
          <h3>规则覆盖</h3>
          <RouterLink class="text-link" :to="{ name: 'rules' }">＋ 添加规则</RouterLink>
        </div>
        <article v-for="(value, name) in displayedRules" :key="name" class="rule-card" :class="{ selected: config.selectedRule === name }">
          <div>
            <code>{{ name }}</code>
            <button v-if="Object.hasOwn(config.draft.overrides, name)" :aria-label="`移除 ${name} 覆盖`" @click="config.inherit(String(name))">
              <span class="i-lucide-x" aria-hidden="true" />
            </button>
          </div>
          <p>{{ effective.get(String(name))?.description || '自定义规则覆盖' }}</p>
          <div>
            我的覆盖<Select :aria-label="`${name} 覆盖级别`" :model-value="Object.hasOwn(config.draft.overrides, name) ? ruleLevel(value) : 'inherit'" :options="[{ value: 'inherit', label: '继承' }, { value: 'off', label: '关闭' }, ...(config.mode !== 'markdownlint' ? [{ value: 'warn', label: '警告' }] : []), { value: 'error', label: config.mode === 'markdownlint' ? '启用' : '错误' }]" @update:model-value="changeRule(String(name), $event)" />
          </div>
          <Code :code="JSON.stringify(value, null, 2)" label="规则覆盖配置" />
          <RouterLink class="text-link" :to="{ name: 'rules' }" @click="config.selectedRule = String(name)">编辑参数 →</RouterLink>
        </article>
        <p v-if="!Object.keys(displayedRules).length" class="notice">
          点击检查诊断可直接调整对应规则，也可以从规则目录添加覆盖。
        </p>
        <RouterLink class="directory-link" :to="{ name: 'rules' }">
          <span class="i-lucide-list-filter" aria-hidden="true" />浏览全部规则 <span>{{ config.rules.length }} →</span>
        </RouterLink>
        <p class="hint">
          语言开关局部更新原始源码；规则覆盖最后追加。两者由配置领域统一写入。
        </p>
      </TabsContent>
      <TabsContent value="source" class="source-config">
        <div class="source-actions">
          <button class="text-link" @click="config.copy(config.draft.code)">
            <span class="i-lucide-copy" aria-hidden="true" />复制源码
          </button><Toggle v-model="showChanges" class="text-link">
            <span class="i-lucide-git-compare-arrows" aria-hidden="true" />{{ showChanges ? '返回源码编辑' : '查看源码变更' }} <span class="tag">{{ config.changeCount }}</span>
          </Toggle>
        </div>
        <div v-if="showChanges" class="source-changes">
          <p v-if="comparison.error" role="alert" class="notice error">
            {{ comparison.error }}
          </p><Diff v-else kind="config" :filename="config.active.configFile" :original="config.baseExported" :modified="comparison.text" />
        </div>
        <Editor v-else v-model="config.draft.code" filename="config.mjs" label="配置源码" />
        <p class="hint">
          完整 JavaScript 配置在沙箱执行。输入包含无效语法时仍保留，执行与导出分别报告失败。
        </p>
      </TabsContent>
    </TabsRoot>
  </aside>
</template>

<style scoped lang="scss">
.source-actions {
display:flex;
flex-wrap:wrap;
gap:10px;
align-items:center;
justify-content:space-between;
margin-bottom:10px;
font-size:11px;
}

.source-changes {
height:480px;
min-height:0;
}

.config-panel {
min-width:0;
border-right:1px solid var(--line);

}

.config-heading{
display:flex;
align-items:center;
justify-content:space-between;
height:53px;
padding:0 16px;
border-bottom:1px solid var(--line);

h2{
display:flex;
gap:7px;
align-items:center;
font-size:12px;

}

}

.icon-button{
color:var(--muted);

[class*='i-']{
width:14px;
height:14px;

}

}

.config-tabs{
display:flex;
gap:20px;
height:42px;
padding:0 16px;
border-bottom:1px solid var(--line);

button{
font-size:11px;
color:var(--muted);
border-bottom:2px solid transparent;

&.active{
color:var(--accent);
border-color:var(--accent);

}

}

}

.config-tools{
display:flex;
align-items:center;
justify-content:space-between;
padding:14px 16px 0;

}

.visual-options{
padding:20px 16px;

}

.language-option{
display:flex;
align-items:center;
justify-content:space-between;
margin:17px 0;
font-size:12px;
color:var(--text);

small{
display:block;
margin-top:3px;
font-size:10px;
color:var(--muted);

}

}

.text-link{
font-size:11px;
color:var(--accent);

}

.hint{
margin-top:18px;
font-size:11px;
line-height:1.9;
color:var(--muted);

}

.rule-heading{
display:flex;
align-items:center;
justify-content:space-between;
padding-top:22px;
margin-top:22px;
border-top:1px solid var(--line);

}

.rule-card{
padding:13px;
margin-top:12px;
border:1px solid var(--line);
border-radius:7px;

&.selected{
background:var(--soft);
border-color:var(--accent);
}

>div{
display:flex;
gap:6px;
justify-content:space-between;

code{
font-size:11px;
overflow-wrap:anywhere;

}

button{
color:var(--muted);

}

}

p{
margin:9px 0;
font-size:11px;
line-height:1.8;
color:var(--muted);

}

label{
display:flex;
align-items:center;
justify-content:space-between;
font-size:11px;
color:var(--muted);

select{
padding:5px 7px;
border:1px solid var(--line);
border-radius:4px;

}

}

pre{
margin:10px 0;
font-size:10px;
line-height:1.7;
color:var(--muted);

}

}

.directory-link{
display:flex;
gap:6px;
align-items:center;
margin-top:20px;
font-size:11px;
color:var(--accent);

span:last-child{
margin-left:auto;

}

}

.source-config{
padding:15px 10px;

}

.config-panel>.notice{
margin:15px;

}

@media(width <=700px){
.config-panel{
border-right:0;

}

.source-config :deep(.code-editor){
height:360px!important;

}

}
</style>
