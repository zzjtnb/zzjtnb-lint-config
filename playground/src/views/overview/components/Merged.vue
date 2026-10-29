<script setup lang="ts">
/** 展示真实最终规则；ESLint 按命中声明的文件条件分组，不推断其他引擎的继承链。 */
import { computed } from 'vue'
import RuleAction from '../../../components/rule/Action.vue'
import RuleMeta from '../../../components/rule/Meta.vue'
import { useConfigStore } from '../../../stores/index'

const props = defineProps<{ query: string, expanded?: boolean }>()
const config = useConfigStore()
const groups = computed(() => {
  const rules = config.rules.filter(rule => rule.configured && `${rule.name} ${rule.description}`.toLowerCase().includes(props.query.trim().toLowerCase()))
  const scoped = new Set(config.configs.filter(item => config.resolved?.matchedConfigs?.includes(item.index) && item.files.length).flatMap(item => Object.keys(item.rules)))
  const sections = config.mode === 'eslint'
    ? [
        {
          name: '通用声明中的规则',
          rules: rules.filter(rule => !scoped.has(rule.name)),
        },
        {
          name: '文件范围声明中的规则',
          rules: rules.filter(rule => scoped.has(rule.name)),
        },
      ]
    : [
        { name: '当前文件最终合并规则', rules },
      ]
  return sections.filter(section => section.rules.length).map(section => ({
    ...section,
    levels: ([
      ['error', '错误'],
      ['warn', '警告'],
      ['off', '关闭'],
    ] as const).map(([level, label]) => ({
      level,
      label,
      rules: section.rules.filter(rule => rule.status === level),
    })).filter(group => group.rules.length),
  }))
})
</script>

<template>
  <p class="merged-note">
    规则值来自当前文件的最终解析结果。点击规则名称查看实际值、默认参数和官方说明。
  </p>
  <AccordionRoot :key="`${config.identity}/${expanded}`" type="multiple" :default-value="expanded === undefined ? groups.filter(group => group.name !== '通用声明中的规则').map(group => group.name) : expanded ? groups.map(group => group.name) : []" class="merged-rules">
    <AccordionItem v-for="group in groups" :key="group.name" :value="group.name" class="merged-group">
      <AccordionHeader>
        <AccordionTrigger class="merged-trigger">
          <span class="i-lucide-chevron-right" aria-hidden="true" />{{ group.name }}<span class="tag">{{ group.rules.length }}</span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="merged-content">
        <section v-for="level in group.levels" :key="level.level" :aria-label="`${level.label}规则`">
          <h3 :class="level.level">
            {{ level.label }} <span>{{ level.rules.length }}</span>
          </h3>
          <article v-for="rule in level.rules" :key="rule.name" class="merged-row">
            <div class="merged-name">
              <span :class="[rule.status, rule.status === 'off' ? 'i-lucide-ban' : rule.status === 'warn' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-alert']" aria-hidden="true" /><RuleAction :name="rule.name" :value="JSON.parse(rule.value)" :rule="rule" :level="rule.status" />
            </div>
            <p>{{ rule.description || '上游未提供规则说明' }}</p><RuleMeta :rule="rule" />
          </article>
        </section>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
  <p v-if="!groups.length" class="empty">
    没有符合搜索条件的规则
  </p>
</template>

<style scoped>
.merged-note {
 margin:0 0 12px;
 font-size:12px;
 color:var(--muted);

}

.merged-group {
 margin-bottom:10px;
 overflow:hidden;
 border:1px solid var(--line);
 border-radius:8px;

}

.merged-trigger {
 display:flex;
 gap:10px;
 align-items:center;
 width:100%;
 padding:13px 15px;
 font-size:13px;
 font-weight:600;
 text-align:left;
 background:var(--soft);

}

.merged-trigger [class*='i-lucide-'] {
 transition:transform .15s;

}

.merged-trigger[data-state='open'] [class*='i-lucide-'] {
 transform:rotate(90deg);

}

.merged-content {
 padding:4px 16px 12px;

}

.merged-content h3 {
 display:flex;
 gap:8px;
 align-items:center;
 margin:16px 0 8px;
 font-size:12px;

}

.merged-content h3 span {
 font-weight:400;
 color:var(--muted);

}

.merged-row {
 display:grid;
 grid-template-columns:minmax(200px,1fr) minmax(220px,1.5fr) auto;
 gap:12px;
 align-items:center;
 padding:10px 0;
 border-top:1px solid var(--line);

}

.merged-name {
 display:flex;
 gap:8px;
 align-items:center;
 min-width:0;

}

.merged-name > span {
 flex:none;

}

.merged-row p {
 margin:0;
 font-size:12px;
 line-height:1.7;
 color:var(--muted);

}

.error {
 color:var(--danger);

}

.warn {
 color:var(--warning);

}

.off {
 color:var(--muted);

}

@media(width <=750px) {
 .merged-row {
 grid-template-columns:minmax(0,1fr) auto;

}

 .merged-row p {
 grid-row:2;
 grid-column:1/-1;

}

}
</style>
