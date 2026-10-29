<script setup lang="ts">
/** 规则名称触发器与配置值弹层，供配置声明和最终合并规则共用。 */
import type { RuleItem } from '../../../types'
import { RouterLink } from 'vue-router'
import { useConfigStore } from '../../stores/config/index'
import Code from '../code/index.vue'

defineProps<{ name: string, value: unknown, rule?: RuleItem, level: 'error' | 'warn' | 'off' }>()
const config = useConfigStore()
function select(name: string) {
  config.selectedRule = name
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger class="rule-name" :aria-label="`${name} 的操作`">
      <code>{{ name }}</code>
    </PopoverTrigger><PopoverPortal to=".workbench">
      <PopoverContent class="rule-popover" align="start" :side-offset="8" :collision-padding="12" :aria-label="`${name} 的操作`">
        <h4><span :class="level === 'off' ? 'i-lucide-ban' : level === 'warn' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-alert'" aria-hidden="true" /><code>{{ name }}</code></h4><div class="rule-popover-actions">
          <a v-if="rule?.url" :href="rule!.url" target="_blank" rel="noreferrer"><span class="i-lucide-book-open" aria-hidden="true" />官方文档</a><button @click="config.copy(name)">
            <span class="i-lucide-copy" aria-hidden="true" />复制名称
          </button><PopoverClose as-child>
            <RouterLink :to="{ name: 'rules', query: { rule: name } }" @click="select(name)"><span class="i-lucide-filter" aria-hidden="true" />按此规则筛选</RouterLink>
          </PopoverClose><PopoverClose as-child>
            <RouterLink :to="{ name: 'rules' }" @click="select(name)"><span class="i-lucide-sliders-horizontal" aria-hidden="true" />查看与编辑规则</RouterLink>
          </PopoverClose><PopoverClose as-child>
            <RouterLink :to="{ name: 'experiment' }" @click="select(name)"><span class="i-lucide-flask-conical" aria-hidden="true" />代码实验</RouterLink>
          </PopoverClose>
        </div><TabsRoot default-value="actual" class="rule-value-tabs">
          <TabsList class="rule-value-tab-list" aria-label="规则配置与默认参数">
            <TabsTrigger value="actual">
              <span class="i-lucide-sliders-horizontal" aria-hidden="true" />实际配置
            </TabsTrigger><TabsTrigger value="defaults">
              <span class="i-lucide-settings-2" aria-hidden="true" />规则默认参数
            </TabsTrigger>
          </TabsList><TabsContent value="actual">
            <Code :code="JSON.stringify(value, null, 2)" label="本配置的实际规则值" />
          </TabsContent><TabsContent value="defaults">
            <Code v-if="rule?.defaultOptions !== undefined" :code="JSON.stringify(rule!.defaultOptions, null, 2)" label="上游规则默认参数" /><p v-else class="hint">
              上游没有提供可展示的默认参数，可查看官方文档。
            </p><p v-if="rule?.defaultOptions !== undefined" class="hint">
              规则默认参数不包含启用级别。
            </p>
          </TabsContent>
        </TabsRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style>
.workbench .rule-popover {
z-index:85;
width:min(460px,calc(100vw - 24px));
max-height:var(--reka-popover-content-available-height);
padding:14px;
overflow:auto;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:9px;
box-shadow:0 8px 30px rgb(0 0 0 / 12%);

}

.workbench .rule-popover h4 {
display:flex;
gap:8px;
align-items:center;
margin:0 0 12px;
font-size:12px;
overflow-wrap:anywhere;

}

.workbench .rule-value-tabs {
margin-top:12px;

}

.workbench .rule-value-tab-list {
display:flex;
gap:6px;
margin-bottom:8px;

}

.workbench .rule-value-tab-list button {
display:flex;
gap:5px;
align-items:center;
padding:7px 9px;
font-size:11px;
color:var(--muted);
border:1px solid var(--line);
border-radius:4px;

}

.workbench .rule-value-tab-list button[data-state='active'] {
color:var(--accent);
background:var(--brand-soft);

}

.workbench .rule-popover .hint {
margin:10px 0;
font-size:11px;
line-height:1.6;
color:var(--muted);

}

.workbench .rule-popover-actions {
display:flex;
flex-wrap:wrap;
gap:6px;

}

.workbench .rule-popover-actions > a,.workbench .rule-popover-actions > button {
display:inline-flex;
gap:5px;
align-items:center;
padding:6px 8px;
font-size:11px;
border:1px solid var(--line);
border-radius:4px;

}

.workbench .rule-popover-actions [class*='i-lucide-'] {
width:13px;
height:13px;

}

.workbench .rule-popover-actions > a:hover,.workbench .rule-popover-actions > button:hover {
color:var(--accent);
background:var(--brand-soft);

}
</style>

<style scoped>
.rule-name {
 color:var(--accent);
 text-align:left;

}

code {
 font-size:12px;
 overflow-wrap:anywhere;

}
</style>
