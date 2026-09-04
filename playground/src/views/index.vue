<script setup lang="ts">
import type { WorkspaceView } from '../../types'

import { computed } from 'vue'
import { configurations } from '../data/configs'
import ConfigSetup from './components/config/index.vue'
import CodeExperiment from './components/experiment/index.vue'
import Icon from './components/Icon.vue'
import RuleReference from './components/rules/index.vue'
import { usePlayground } from './usePlayground'

const {
  mode,
  view,
  modes,
  query,
  ruleFilter,
  dark,
  activeConfig,
  filename,
  source,
  rawConfigs,
  rules,
  filteredRules,
  selectedRule,
  selectRule,
  meta,
  metaLoading,
  metaError,
  loadMetadata,
  result,
  running,
  runError,
  stale,
  errors,
  warnings,
  fixed,
  run,
  cancelRun,
  copied,
  copiedTarget,
  sharing,
  shareError,
  stateError,
  copyText,
  share,
  reset,
  selectMode,
  selectFile,
} = usePlayground()
const views: {
  id: WorkspaceView
  label: string
  icon: string
  description: string
}[] = [
  {
    id: 'code',
    label: '代码实验',
    icon: 'code',
    description: '编辑代码，检查问题，对照修复结果。',
  },
  {
    id: 'config',
    label: '配置接入',
    icon: 'terminal',
    description: '安装依赖，复制配置，在自己的项目中运行。',
  },
  {
    id: 'rules',
    label: '规则参考',
    icon: 'rules',
    description: '按文件类型查询实际规则和配置值。',
  },
]
const task = computed(() => views.find(item => item.id === view.value)!)
const feedback = computed(() => {
  if (shareError.value || stateError.value || runError.value || metaError.value)
    return (
      shareError.value || stateError.value || runError.value || metaError.value
    )
  if (copiedTarget.value) return '内容已复制到剪贴板'
  if (running.value) return '正在检查当前代码'
  if (stale.value) return '代码已修改，请重新检查'
  if (result.value)
    return `检查完成：${errors.value} 个错误，${warnings.value} 个警告`
  return '草稿保存在当前浏览器'
})
</script>

<template>
  <div class="lab" :class="{ dark }" :data-tool="mode">
    <a class="skip-link" href="#workbench">跳到工作区</a>
    <header class="topbar">
      <a
        class="brand"
        href="#"
        aria-label="Lint Lab，返回代码实验"
        @click.prevent="view = 'code'"
      >
        <span class="brand-symbol" aria-hidden="true"><Icon name="code" :size="21" /></span>
        <strong>Lint Lab</strong><span class="brand-caption">配置实验室</span>
      </a>
      <nav class="package-nav" aria-label="选择配置包">
        <button
          v-for="tool in modes"
          :key="tool"
          class="package-button"
          :class="{ active: mode === tool }"
          :aria-pressed="mode === tool"
          type="button"
          @click="selectMode(tool)"
        >
          <span class="tool-mark" :data-tool="tool" aria-hidden="true">{{
            configurations[tool].name.charAt(0)
          }}</span>{{ configurations[tool].name }}
        </button>
      </nav>
      <div class="header-actions">
        <a
          class="icon-button repository-link"
          href="https://github.com/zzjtnb/zzjtnb-lint-config"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub 仓库"
          ><Icon name="github" :size="18" /></a>
        <button
          class="icon-button"
          type="button"
          aria-label="切换主题"
          :aria-pressed="dark"
          @click="dark = !dark"
        >
          <Icon :name="dark ? 'sun' : 'moon'" :size="18" />
        </button>
        <button
          class="button secondary share-button"
          type="button"
          title="分享当前配置"
          :aria-disabled="sharing"
          @click="share"
        >
          <Icon name="share" :size="15" /><span>{{
            copied ? "链接已复制" : sharing ? "正在复制…" : "分享工作区"
          }}</span>
        </button>
      </div>
    </header>

    <nav class="workspace-navigation" aria-label="工作区导航">
      <div class="view-switcher" role="group" aria-label="工作区任务">
        <button
          v-for="item in views"
          :key="item.id"
          type="button"
          :class="{ active: view === item.id }"
          :aria-pressed="view === item.id"
          @click="view = item.id"
        >
          <Icon :name="item.icon" :size="16" />{{ item.label }}
        </button>
      </div>
      <a
        class="text-button"
        :href="activeConfig.docs"
        target="_blank"
        rel="noreferrer"
        >使用文档<Icon name="external" :size="13" /></a>
    </nav>

    <main id="workbench" tabindex="-1" class="workbench">
      <div class="workspace-context">
        <div class="context-title">
          <h1>{{ task.label }}</h1>
          <p>{{ task.description }}</p>
        </div>
        <div class="context-actions">
          <label v-if="view !== 'config'" class="target-select"><span>文件类型</span><select
              :value="filename"
              @change="selectFile(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="example in activeConfig.examples"
                :key="example.filename"
                :value="example.filename"
              >
                {{ example.label }}
              </option>
            </select></label>
          <button
            class="package-name"
            type="button"
            title="复制配置包名"
            @click="copyText(activeConfig.packageName, 'package')"
          >
            <code>{{ activeConfig.packageName }}</code><Icon
              :name="copiedTarget === 'package' ? 'check' : 'copy'"
              :size="13"
            />
          </button>
        </div>
      </div>
      <div class="task-content">
        <CodeExperiment
          v-if="view === 'code'"
          v-model="source"
          :active-config="activeConfig"
          :mode="mode"
          :filename="filename"
          :result="result"
          :running="running"
          :run-error="runError"
          :meta-error="metaError"
          :stale="stale"
          :errors="errors"
          :warnings="warnings"
          :fixed="fixed"
          @run="run"
          @cancel-run="cancelRun"
          @reset="reset"
          @retry="loadMetadata(true)"
          @show-rules="view = 'rules'"
        />
        <ConfigSetup
          v-else-if="view === 'config'"
          v-model="rawConfigs[mode]"
          :mode="mode"
          :active-config="activeConfig"
          :copied-target="copiedTarget"
          @reset="reset"
          @copy="copyText"
        />
        <RuleReference
          v-else
          v-model:query="query"
          v-model:filter="ruleFilter"
          :filename="filename"
          :rules="filteredRules"
          :total="rules.length"
          :selected-rule="selectedRule"
          :meta-loading="metaLoading"
          :meta-error="metaError"
          @retry="loadMetadata(true)"
          @select-rule="selectRule"
          @copy="copyText"
          :copied-target="copiedTarget"
        />
      </div>
    </main>
    <footer class="workspace-footer">
      <span role="status" :title="feedback">{{ feedback }}</span>
      <span class="engine-label"><span class="status-dot" :class="{ unavailable: !!metaError }"></span>{{
          metaLoading
            ? "正在读取引擎…"
            : meta
              ? `${activeConfig.name} 引擎 v${meta.version}`
              : "本地运行器未连接"
        }}</span>
    </footer>
  </div>
</template>

<style lang="scss" src="./styles.scss"></style>
