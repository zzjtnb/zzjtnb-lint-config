<script setup lang="ts">
import type { RuleItem } from '../../../../types'

import { computed, ref } from 'vue'
import Icon from '../Icon.vue'
import { ruleLevels } from './levels'
import RuleList from './List.vue'

const props = defineProps<{
  // 规则按该虚拟文件解析出的最终配置展示。
  filename: string
  // 已按搜索词和状态筛选后的规则。
  rules: RuleItem[]
  // 筛选前的规则总数。
  total: number
  selectedRule: RuleItem | undefined
  metaLoading: boolean
  // 规则元数据加载失败的提示；空字符串表示正常。
  metaError: string
  // 最近复制成功的目标标识，用于短暂显示已复制状态；空字符串表示无。
  copiedTarget: string
}>()
const emit = defineEmits<{
  // 重新加载规则元数据。
  retry: []
  selectRule: [name: string]
  // text 为要复制的内容，target 标识触发复制的按钮。
  copy: [text: string, target: string]
}>()
const query = defineModel<string>('query', { required: true })
const ruleFilter = defineModel<'all' | 'enabled' | 'off'>('filter', {
  required: true,
})
const detail = ref<HTMLElement>()
// 引擎提供 JSON 配置值；只在详情展示处排版，不改写共同契约。
const formattedValue = computed(() =>
  props.selectedRule
    ? JSON.stringify(JSON.parse(props.selectedRule.value), null, 2)
    : '',
)
</script>

<template>
  <section class="rules-layout" aria-label="实际规则参考">
    <div class="rules-list-card">
      <div class="rules-filter">
        <h2>
          规则列表 <span>{{ total }}</span>
        </h2>
        <label><span class="sr-only">规则筛选</span><select v-model="ruleFilter">
            <option value="all">全部规则</option>
            <option value="enabled">仅看已启用</option>
            <option value="off">仅看未启用</option>
          </select></label>
      </div>
      <p class="rule-guide">
        这里展示规则如何检查代码，不是代码检查结果。选择规则查看含义和配置。
      </p>
      <div v-if="metaLoading" class="rule-loading">
        <span class="loader"></span>正在从引擎读取规则…
      </div>
      <div v-else-if="metaError" class="inline-notice">
        <p>{{ metaError }}</p>
        <button class="text-button" type="button" @click="emit('retry')">
          重新读取
        </button>
      </div>
      <RuleList
        v-else
        v-model="query"
        :rules="rules"
        :total="total"
        :selected="selectedRule?.name"
        @select-rule="emit('selectRule', $event)"
      />
      <button
        v-if="selectedRule"
        class="mobile-detail-link"
        type="button"
        @click="detail?.focus()"
      >
        查看所选规则详情<Icon name="arrow" :size="14" />
      </button>
    </div>
    <section
      ref="detail"
      class="rule-detail-card"
      tabindex="-1"
      aria-label="规则详情"
    >
      <template v-if="selectedRule">
        <div class="rule-detail-heading">
          <span>{{ selectedRule.category }}</span><span class="rule-level" :class="selectedRule.status">{{
            ruleLevels[selectedRule.status].label
          }}</span>
        </div>
        <div class="rule-detail-body">
          <h2>{{ selectedRule.name }}</h2>
          <p class="rule-description">{{ selectedRule.description }}</p>
          <dl class="rule-properties">
            <div>
              <dt>检查方式</dt>
              <dd>{{ ruleLevels[selectedRule.status].description }}</dd>
            </div>
            <div>
              <dt>适用文件</dt>
              <dd>
                <code>{{ filename }}</code>
              </dd>
            </div>
            <div>
              <dt>配置来源</dt>
              <dd>共享默认配置 · 引擎实际解析</dd>
            </div>
          </dl>
          <div class="rule-value-heading">
            <h3>配置值</h3>
            <button
              class="button secondary"
              type="button"
              @click="emit('copy', formattedValue, 'rule-value')"
            >
              <Icon
                :name="copiedTarget === 'rule-value' ? 'check' : 'copy'"
                :size="14"
              />{{ copiedTarget === "rule-value" ? "已复制" : "复制配置值" }}
            </button>
          </div>
          <pre class="rule-value"><code>{{ formattedValue }}</code></pre>
          <p class="rule-explanation">
            <Icon
              name="info"
              :size="15"
            />切换上方文件类型，查看其他文件实际使用的规则。
          </p>
          <a
            v-if="selectedRule.url"
            class="docs-link"
            :href="selectedRule.url"
            target="_blank"
            rel="noreferrer"
            ><Icon name="book" :size="16" />阅读规则官方文档<Icon
              name="external"
              :size="13"
          /></a>
        </div>
      </template>
      <div v-else class="rule-empty">
        <Icon name="rules" :size="28" /><strong>{{
          query || ruleFilter !== "all"
            ? "当前筛选没有可查看的规则"
            : "选择一条规则"
        }}</strong>
        <p>规则详情与左侧搜索结果保持一致。</p>
      </div>
    </section>
  </section>
</template>

<style lang="scss" src="./styles.scss"></style>
