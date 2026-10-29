<script setup lang="ts">
import type { SplitterPanel } from 'reka-ui'
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import Console from '../../components/console/index.vue'
import Diff from '../../components/diff/index.vue'
import Scroll from '../../components/scroll/index.vue'
import Select from '../../components/select/index.vue'
import { clearLog, runtimeLog } from '../../sandbox/client'
import { useConfigStore, useExperimentStore } from '../../stores/index'
import Config from './components/Config.vue'

const config = useConfigStore()
const media = window.matchMedia('(max-width: 900px)')
const compact = ref(media.matches)
function updateScreen(event: MediaQueryListEvent) {
  compact.value = event.matches
}
onMounted(() => media.addEventListener('change', updateScreen))
onUnmounted(() => media.removeEventListener('change', updateScreen))
const mainPane = ref<InstanceType<typeof SplitterPanel>>()
const configPane = ref<InstanceType<typeof SplitterPanel>>()
const diagnosticsPane = ref<InstanceType<typeof SplitterPanel>>()
const consolePane = ref<InstanceType<typeof SplitterPanel>>()
function restoreLayout() {
  mainPane.value?.resize(76)
  configPane.value?.resize(23)
  diagnosticsPane.value?.resize(55)
}
const experiment = useExperimentStore()
const customPath = ref(false)
const editorFiles = computed(() => [
  ...new Set([
    ...config.active.targets.map(item => item.filename),
    ...Object.keys(experiment.supportedFiles),
    config.draft.filename,
  ]),
])
const selectedFile = computed({
  get: () => config.draft.filename,
  set: async (path: string) => {
    if (path !== '__custom__') {
      experiment.selectFile(path)
      return
    }
    customPath.value = true
    await nextTick()
    document.getElementById('editor-path')?.focus()
  },
})
watch(() => config.mode, () => {
  customPath.value = false
})
const panel = ref('source')
const renaming = ref(false)
const filename = ref('')
const fileError = ref('')
const restoring = ref(false)
watch(() => `${config.mode}/${config.draft.filename}`, () => {
  renaming.value = false
  restoring.value = false
  fileError.value = ''
})
async function editFilename() {
  filename.value = config.draft.filename
  renaming.value = true
  fileError.value = ''
  await nextTick()
  document.getElementById('rename-file')?.focus()
}
function rename() {
  try {
    experiment.renameFile(filename.value)
    renaming.value = false
    fileError.value = ''
  }
  catch (error) {
    fileError.value = error instanceof Error
      ? error.message
      : String(error)
  }
}
const diff = ref<InstanceType<typeof Diff>>()
const query = shallowRef('')
const severity = shallowRef('all')
const messages = computed(() => experiment.current?.result.messages ?? [])
const counts = computed(() => ({
  errors: messages.value.filter(item => item.severity === 'error').length,
  warnings: messages.value.filter(item => item.severity === 'warning').length,
}))
const visibleMessages = computed(() => {
  const search = query.value.trim().toLowerCase()
  return messages.value.filter(item => (severity.value === 'all' || item.severity === severity.value)
    && (!search || `${item.rule ?? ''} ${item.message}`.toLowerCase().includes(search)))
})
const fixAvailable = computed(() => experiment.current?.action === 'fix' && experiment.current.result.output !== experiment.current.original)
const currentFix = computed(() => fixAvailable.value && !experiment.stale)
const modified = computed(() => currentFix.value ? experiment.current!.result.output : experiment.source)
async function locate(line?: number, column?: number, rule?: string) {
  if (rule)
    config.selectedRule = rule
  panel.value = 'source'
  await nextTick()
  if (currentFix.value)
    diff.value?.focusModified(line, column)
  else diff.value?.focusOriginal(line, column)
}
</script>

<template>
  <section class="experiment">
    <div v-if="experiment.preparationError" class="preparation error" role="status">
      {{ experiment.preparationError }}
      <button class="text-link" @click="experiment.prepare">
        <span class="i-lucide-rotate-cw" aria-hidden="true" />重试准备
      </button>
    </div>
    <TabsRoot v-model="panel">
      <TabsList class="mobile-workspaces" aria-label="实验工作区">
        <TabsTrigger v-for="item in [{ key: 'config', label: '配置' }, { key: 'source', label: '代码' }, { key: 'results', label: '结果' }]" :key="item.key" :value="item.key">
          {{ item.label }}
        </TabsTrigger>
      </TabsList>
    </TabsRoot>
    <div class="experiment-size">
      <SplitterGroup :key="String(compact)" :direction="compact ? 'vertical' : 'horizontal'" :auto-save-id="`lint-workspace-${compact ? 'compact' : 'wide'}`" class="experiment-layout" @keydown.ctrl.enter.capture.prevent.stop="!experiment.preparing && experiment.run('check')" @keydown.meta.enter.capture.prevent.stop="!experiment.preparing && experiment.run('check')">
        <SplitterPanel id="main" ref="mainPane" :default-size="76" :min-size="45" class="editor-pane">
          <SplitterGroup direction="horizontal" :auto-save-id="`lint-editor-${compact ? 'compact' : 'wide'}`" class="editor-workspace">
            <SplitterPanel id="config" ref="configPane" :collapsible="!compact" :collapsed-size="0" :default-size="23" :min-size="14" :max-size="45" class="config-pane" :class="{ 'mobile-hidden': panel !== 'config' }">
              <Scroll label="当前配置编辑区">
                <Config />
              </Scroll>
            </SplitterPanel>
            <SplitterResizeHandle class="resize-handle horizontal" aria-label="调整配置区宽度" />
            <SplitterPanel id="source" :default-size="77" :min-size="40" class="source-pane" :class="{ 'mobile-hidden': panel !== 'source' }">
              <section class="source-panel">
                <div class="source-toolbar">
                  <div class="file-heading">
                    <span class="file-label">{{ config.draft.filename.split('.').pop()?.toUpperCase() }}</span>
                    <Select v-if="!customPath" v-model="selectedFile" class="editor-file-select" aria-label="编辑文件" :options="[...editorFiles.map(path => ({ value: path, label: path })), { value: '__custom__', label: '自定义路径…' }]" /><template v-else>
                      <input id="editor-path" v-model="config.draft.filename" aria-label="编辑文件" class="editor-file-input"><button class="text-link" @click="customPath = false">
                        选择已有文件
                      </button>
                    </template>
                  </div>
                  <div class="actions">
                    <button class="btn panel-toggle" @click="configPane?.isCollapsed ? configPane?.expand() : configPane?.collapse()">
                      <span class="i-lucide-panel-left" aria-hidden="true" />切换配置面板
                    </button>
                    <button class="btn panel-toggle" @click="consolePane?.isCollapsed ? consolePane?.expand() : consolePane?.collapse()">
                      <span class="i-lucide-panel-bottom" aria-hidden="true" />切换控制台
                    </button>
                    <TooltipRoot>
                      <TooltipTrigger as-child>
                        <button class="btn" :disabled="experiment.running" @click="restoring = !restoring">
                          <span class="i-lucide-rotate-ccw" aria-hidden="true" />恢复初始代码
                        </button>
                      </TooltipTrigger><TooltipPortal to=".workbench">
                        <TooltipContent class="ui-tooltip" :side-offset="6">
                          恢复为导入原文或同类型默认示例，保留配置草稿
                        </TooltipContent>
                      </TooltipPortal>
                    </TooltipRoot>
                    <button class="btn" :disabled="experiment.running" @click="editFilename">
                      <span class="i-lucide-file-pen-line" aria-hidden="true" />重命名文件
                    </button>
                    <button v-if="experiment.running" class="btn" @click="experiment.cancel">
                      <span class="i-lucide-square" aria-hidden="true" />取消执行
                    </button>
                    <button class="btn primary" :disabled="experiment.running || experiment.preparing" @click="experiment.run('check')">
                      <span class="i-lucide-play" aria-hidden="true" />{{ experiment.running ? '检查中…' : '检查代码' }}
                    </button>
                    <button class="btn" :disabled="experiment.running || experiment.preparing" @click="experiment.run('fix')">
                      <span class="i-lucide-wand-sparkles" aria-hidden="true" />预览修复
                    </button>
                    <TooltipRoot>
                      <TooltipTrigger as-child>
                        <button class="btn" @click="restoreLayout">
                          <span class="i-lucide-panels-top-left" aria-hidden="true" />还原布局
                        </button>
                      </TooltipTrigger><TooltipPortal to=".workbench">
                        <TooltipContent class="ui-tooltip" :side-offset="6">
                          恢复面板默认尺寸，保留代码和配置
                        </TooltipContent>
                      </TooltipPortal>
                    </TooltipRoot>
                  </div>
                </div>
                <form v-if="renaming" class="file-action-form" @submit.prevent="rename">
                  <label for="rename-file">新的文件路径<input id="rename-file" v-model="filename" spellcheck="false" @keydown.esc="renaming = false"></label>
                  <button class="btn primary" type="submit">
                    保存文件名
                  </button><button class="btn" type="button" @click="renaming = false">
                    取消命名
                  </button>
                  <p v-if="fileError" class="notice error" role="alert">
                    {{ fileError }}
                  </p>
                </form>
                <AlertDialogRoot v-model:open="restoring">
                  <AlertDialogPortal to=".workbench">
                    <AlertDialogOverlay class="dialog-overlay" /><AlertDialogContent class="dialog-content">
                      <AlertDialogTitle>恢复初始代码？</AlertDialogTitle><AlertDialogDescription>恢复为导入原文或同类型默认示例，仅覆盖当前代码，配置保留。</AlertDialogDescription><div class="dialog-actions">
                        <AlertDialogCancel class="btn">
                          保留当前代码
                        </AlertDialogCancel><AlertDialogAction class="btn primary" @click="experiment.reset()">
                          确认恢复代码
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialogPortal>
                </AlertDialogRoot>
                <div class="source-editor">
                  <Diff ref="diff" :original="experiment.source" :modified="modified" :filename="config.draft.filename" editable :diagnostics="!experiment.stale ? experiment.current?.result.messages : []" :modified-diagnostics="currentFix" @update:original="experiment.source = $event" />
                </div>
                <div class="source-footer">
                  <span>{{ experiment.current?.action === 'fix' ? experiment.stale ? '输入已变化，请重新预览修复' : '右侧为修复预览，原始输入尚未替换' : '运行自动修复后，右侧就地展示差异' }}</span>
                  <button v-if="fixAvailable" class="btn primary" :disabled="experiment.stale" @click="experiment.applyFix">
                    <span class="i-lucide-check-check" aria-hidden="true" />应用修复到源码
                  </button>
                  <span v-else>输入仅用于分析 · UTF-8</span>
                </div>
              </section>
            </SplitterPanel>
          </SplitterGroup>
        </SplitterPanel>
        <SplitterResizeHandle class="resize-handle main-handle" :class="compact ? 'vertical' : 'horizontal'" aria-label="调整编辑区与结果区大小" />
        <SplitterPanel id="results" :default-size="24" :min-size="18" :max-size="50" class="results-pane" :class="{ 'mobile-hidden': panel !== 'results' }">
          <SplitterGroup direction="vertical" :auto-save-id="`lint-results-${compact ? 'compact' : 'wide'}`" class="result-workspace">
            <SplitterPanel id="diagnostics" ref="diagnosticsPane" :default-size="55" :min-size="20">
              <section class="diagnostics" aria-label="检查诊断">
                <div class="result-heading">
                  <h2><span class="i-lucide-list-checks" aria-hidden="true" />{{ experiment.current?.action === 'fix' ? '修复后诊断' : '检查结果' }}</h2>
                  <div v-if="experiment.current" class="result-summary">
                    <span>{{ counts.errors }} 个错误 / {{ counts.warnings }} 个警告</span>
                    <span>{{ (experiment.current.result.duration / 1000).toFixed(2) }} s</span>
                  </div>
                  <span class="tag" :class="experiment.stale ? 'amber' : experiment.current ? 'green' : ''">{{ experiment.stale ? '输入已变化' : experiment.current ? '已完成' : '尚未运行' }}</span>
                </div>
                <div v-if="messages.length" class="diagnostic-filters">
                  <input v-model="query" type="search" aria-label="筛选诊断" placeholder="搜索诊断或规则…">
                  <Select v-model="severity" aria-label="诊断级别" :options="[{ value: 'all', label: '全部级别' }, { value: 'error', label: '错误' }, { value: 'warning', label: '警告' }]" />
                  <span>{{ visibleMessages.length }} / {{ messages.length }}</span>
                </div>
                <Scroll class="diagnostic-list" label="检查诊断列表">
                  <p v-if="experiment.error" class="notice error" role="alert">
                    {{ experiment.error }}
                  </p>
                  <template v-else-if="experiment.current">
                    <p v-if="experiment.stale" class="notice">
                      诊断属于旧输入，重新检查后更新。
                    </p>
                    <p v-if="experiment.current.result.ignored" class="notice">
                      此文件未包含或被忽略，不能视为检查通过。
                    </p>
                    <button v-for="(message, index) in visibleMessages" :key="index" class="diagnostic" :disabled="experiment.stale" @click="locate(message.line, message.column, message.rule)">
                      <span :class="message.severity === 'warning' ? 'i-lucide-triangle-alert warning' : 'i-lucide-circle-x error'" aria-hidden="true" />
                      <span class="message">{{ message.message }}</span>
                      <code>{{ message.rule || '引擎诊断' }}</code>
                      <span class="location">{{ message.line ?? '?' }}:{{ message.column ?? '?' }}</span>
                    </button>
                    <p v-if="!experiment.current.result.ignored && !experiment.current.result.messages.length" class="empty">
                      没有诊断
                    </p>
                    <p v-else-if="messages.length && !visibleMessages.length" class="empty">
                      没有符合筛选条件的诊断。<button class="text-link" @click="query = '';severity = 'all'">
                        清除筛选
                      </button>
                    </p>
                  </template>
                  <p v-else class="empty">
                    检查后显示问题列表，点击问题可定位代码。
                  </p>
                </Scroll>
              </section>
            </SplitterPanel>
            <SplitterResizeHandle class="resize-handle vertical" aria-label="调整诊断与控制台高度" />
            <SplitterPanel id="console" ref="consolePane" :collapsible="!compact" :collapsed-size="0" :default-size="45" :min-size="15">
              <Console :output="runtimeLog" @clear="clearLog" />
            </SplitterPanel>
          </SplitterGroup>
        </SplitterPanel>
      </SplitterGroup>
    </div>
  </section>
</template>

<style scoped lang="scss">
.experiment {
display:flex;
flex-direction:column;
min-width:0;
}

.experiment-tools {
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
justify-content:space-between;
margin:0 0 6px;
}

.experiment-tools > div {
display:flex;
gap:6px;
}

.experiment-hint {
font-size:10px;
color:var(--muted);
}

.experiment-size {
height:calc(100dvh - 190px);
min-height:440px;
padding-bottom:8px;
overflow:hidden;
resize:vertical;
}

.experiment-layout {
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
}

.editor-workspace,.source-panel,.diagnostics {
min-width:0;
height:100%;
min-height:0;
}

.config-pane {
overflow:hidden !important;
}

.config-pane :deep(.config-panel) {
min-height:100%;
}

.source-panel,.diagnostics {
display:flex;
flex-direction:column;
}

.source-toolbar {
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
justify-content:space-between;
min-height:42px;
padding:6px 9px;
border-bottom:1px solid var(--line);
}

.file-heading,.actions {
display:flex;
gap:6px;
align-items:center;
min-width:0;
}

.file-heading code {
display:block;
max-width:200px;
overflow:hidden;
text-overflow:ellipsis;
font-size:11px;
white-space:nowrap;
}

.file-heading > [role='group'] {
min-width:0;
}

.file-label {
font:600 10px var(--font-mono);
color:var(--accent);
}

.actions {
flex-wrap:wrap;
justify-content:flex-end;
margin-left:auto;
}

.actions .btn {
padding:5px 8px;
font-size:11px;
}

.source-editor {
flex:1;
min-height:0;
}

.source-editor :deep(.diff-editor) {
min-height:150px;
border:0;
}

.source-footer {
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
justify-content:space-between;
min-height:30px;
padding:5px 9px;
font-size:10px;
color:var(--muted);
border-top:1px solid var(--line);
}

.source-footer .btn {
padding:3px 7px;
font-size:10px;
}

.result-heading {
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
min-height:38px;
padding:8px 10px;
border-bottom:1px solid var(--line);
}

.result-heading h2 {
display:flex;
gap:6px;
align-items:center;
font-size:12px;
}

.result-heading .tag {
margin-left:auto;
}

.result-summary {
display:flex;
gap:8px;
font-size:10px;
color:var(--muted);
}

.diagnostic-list {
flex:1;
min-height:0;
}

.diagnostic-filters {
display:flex;
gap:6px;
align-items:center;
padding:6px 9px;
font-size:10px;
border-bottom:1px solid var(--line);
}

.diagnostic-filters input {
flex:1;
min-width:0;
padding:6px;
border:1px solid var(--line);
border-radius:4px;
}

.diagnostic-filters :deep(.select-trigger) {
min-width:90px;
padding:5px 7px;
font-size:10px;
}

.resize-handle {
display:flex;
flex-shrink:0;
align-items:center;
justify-content:center;
touch-action:none;
outline-offset:-1px;
background:var(--well);
}

.resize-handle::after {
content:'';
background:var(--line);
border-radius:2px;
}

.resize-handle.horizontal {
width:6px;
cursor:col-resize;
}

.resize-handle.horizontal::after {
width:2px;
height:32px;
}

.resize-handle.vertical {
height:6px;
cursor:row-resize;
}

.resize-handle.vertical::after {
width:32px;
height:2px;
}

.resize-handle:hover,.resize-handle[data-state='drag'] {
background:var(--brand-soft);
}

.resize-handle:focus-visible::after {
background:var(--accent);
}

.changes-panel {
padding:12px;
margin-bottom:8px;
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
}

.changes-panel :deep(.diff-view) {
height:300px;
}

.file-action-form,.preparation {
display:flex;
flex-wrap:wrap;
gap:8px;
align-items:center;
padding:8px 10px;
font-size:11px;
background:var(--well);
}

.file-action-form input {
flex:1;
min-width:130px;
padding:6px;
border:1px solid var(--line);
border-radius:4px;
}

.mobile-workspaces {
display:none;
}

.diagnostic {
display:grid;
grid-template-columns:16px minmax(0,1fr) 38px;
gap:8px;
align-items:start;
width:100%;
padding:10px;
font-size:11px;
text-align:left;
border-bottom:1px solid var(--line);
}

.diagnostic:hover {
background:var(--well);
}

.diagnostic .message {
line-height:1.8;
overflow-wrap:anywhere;
}

.diagnostic code {
grid-column:2;
font-size:10px;
color:var(--muted);
overflow-wrap:anywhere;
}

.diagnostic .location {
grid-row:1/span 2;
grid-column:3;
font-size:10px;
color:var(--muted);
}

.diagnostic:disabled {
cursor:default;
opacity:.6;
}

.error {
color:var(--danger);
}

.warning {
color:var(--warning);
}

@media(width <=900px) {
.experiment-size {
height:calc(100dvh - 230px);
min-height:460px;
}

.experiment-hint {
display:none;
}

.experiment-layout :deep(.editor-pane) {
min-height:260px;
}
}

@media(width <=700px) {
.panel-toggle {
display:none;
}

.mobile-workspaces {
display:flex;
gap:6px;
padding:6px;
margin-bottom:6px;
border:1px solid var(--line);
border-radius:6px;
}

.mobile-workspaces button {
flex:1;
padding:6px;
font-size:12px;
}

.mobile-workspaces button[data-state='active'] {
color:var(--accent);
background:var(--brand-soft);
border-radius:4px;
}

.mobile-hidden {
display:none !important;
}

.experiment-size {
height:580px;
min-height:400px;
}

.experiment-layout {
display:block !important;
}

.editor-pane,.results-pane {
height:100%;
}

.experiment-layout > .main-handle,.editor-workspace > .resize-handle {
display:none;
}

.experiment-layout:has(.source-pane:not(.mobile-hidden)) > .results-pane {
display:none;
}

.experiment-layout:has(.config-pane:not(.mobile-hidden)) > .results-pane {
display:none;
}

.experiment-layout:has(.results-pane:not(.mobile-hidden)) > .editor-pane {
display:none;
}

.experiment-tools .btn {
padding:5px 8px;
}
}
</style>
