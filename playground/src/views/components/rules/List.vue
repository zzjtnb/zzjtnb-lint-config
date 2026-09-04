<script setup lang="ts">
import type { RuleItem } from '../../../../types'

import { computed, ref, watch } from 'vue'

import Icon from '../Icon.vue'
import { ruleLevels } from './levels'

const props = defineProps<{
  // 已筛选的规则。
  rules: RuleItem[]
  // 当前选中的规则名；未选中时省略。
  selected?: string
  // 筛选前的规则总数，与 rules.length 一起显示筛选比例。
  total: number
}>()
const emit = defineEmits<{ selectRule: [name: string] }>()
const model = defineModel<string>({ required: true })
const visible = ref(80)
const visibleRules = computed(() => props.rules.slice(0, visible.value))
watch(
  () => props.rules,
  () => {
    visible.value = 80
  },
)
</script>

<template>
  <section class="rule-browser" aria-labelledby="rule-heading">
    <div class="rule-browser-head">
      <h2 id="rule-heading">
        规则索引 <span>{{ rules.length }} / {{ total }}</span>
      </h2>
      <label class="search-field">
        <Icon name="search" :size="17" />
        <span class="sr-only">搜索规则</span>
        <input
          v-model="model"
          type="search"
          placeholder="搜索规则名、插件或说明…"
        />
      </label>
    </div>
    <ul class="rule-list" role="list" aria-label="规则列表">
      <li v-for="rule in visibleRules" :key="rule.name">
        <button
          type="button"
          class="rule-row"
          :class="{ selected: selected === rule.name }"
          :aria-pressed="selected === rule.name"
          @click="emit('selectRule', rule.name)"
        >
          <span
            class="rule-indicator"
            :class="rule.status"
            aria-hidden="true"
          ></span>
          <span class="rule-row-copy">
            <code>{{ rule.name }}</code>
            <small>{{ rule.category }}</small>
          </span>
          <span
            class="rule-level"
            :class="rule.status"
            :title="ruleLevels[rule.status].description"
            >{{ ruleLevels[rule.status].label }}</span>
        </button>
      </li>
    </ul>
    <div v-if="!rules.length" class="rule-empty">
      <Icon name="search" :size="26" />
      <strong>没有匹配的规则</strong>
      <p>试试其他关键词，或切换已启用与未启用的筛选。</p>
      <button
        v-if="model"
        class="text-button"
        type="button"
        @click="model = ''"
      >
        清空搜索
      </button>
    </div>
    <button
      v-if="rules.length > visible"
      class="load-more"
      type="button"
      @click="visible += 80"
    >
      继续显示规则 · 还有 {{ rules.length - visible }} 条
    </button>
  </section>
</template>
