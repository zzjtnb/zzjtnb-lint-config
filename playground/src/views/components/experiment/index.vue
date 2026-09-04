<script setup lang="ts">
import type {
  LintResult,
  PlaygroundConfig,
  PlaygroundMode,
} from '../../../../types'

import { computed, onUnmounted, ref, watch } from 'vue'
import Editor from '../editor/index.vue'
import Icon from '../Icon.vue'

const props = defineProps<{
  // 当前工具的示例文件、命令与说明。
  activeConfig: PlaygroundConfig
  mode: PlaygroundMode
  // 本次检查使用的虚拟文件名，决定引擎按哪种语言解析。
  filename: string
  // 最近一次完成的检查结果；从未检查时为 undefined。
  result: LintResult | undefined
  running: boolean
  // 检查请求失败的提示；空字符串表示没有失败。
  runError: string
  // 规则元数据加载失败的提示；空字符串表示正常。
  metaError: string
  // 结果对应的工具、文件或代码已变化，需要重新检查。
  stale: boolean
  errors: number
  warnings: number
  // 本次修复请求实际改写了代码，而不只是请求过修复。
  fixed: boolean
}>()
const emit = defineEmits<{
  // fix 为 true 时请求自动修复并回写编辑器。
  run: [fix: boolean]
  // 放弃尚未返回的检查，迟到结果不再覆盖界面。
  cancelRun: []
  // 恢复当前工具的示例代码与配置草稿。
  reset: []
  // 重新加载规则元数据。
  retry: []
  showRules: []
}>()
const source = defineModel<string>({ required: true })
const codeEditor = ref<InstanceType<typeof Editor>>()
const leftWidth = ref(60)
const minWidth = 30
const maxWidth = 65
const severity = ref<'all' | 'error' | 'warning'>('all')
const diagnostics = computed(
  () =>
    props.result?.diagnostics.filter(
      issue => severity.value === 'all' || issue.severity === severity.value,
    ) ?? [],
)
let stopResize: (() => void) | undefined

watch(
  () => props.result,
  () => {
    severity.value = 'all'
  },
)

function setWidth(width: number) {
  leftWidth.value = Math.min(maxWidth, Math.max(minWidth, width))
}

function resizeWithKeyboard(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowLeft':
      setWidth(leftWidth.value - (event.shiftKey ? 5 : 1))
      break
    case 'ArrowRight':
      setWidth(leftWidth.value + (event.shiftKey ? 5 : 1))
      break
    case 'Home':
      setWidth(minWidth)
      break
    case 'End':
      setWidth(maxWidth)
      break
    default:
      return
  }
  event.preventDefault()
}

function startResize(event: PointerEvent) {
  if (event.button !== 0) return
  stopResize?.()
  const parent = (event.currentTarget as HTMLElement).parentElement
  if (!parent) return
  const bounds = parent.getBoundingClientRect()
  if (bounds.width <= 0) return
  event.preventDefault()
  const move = (next: PointerEvent) => {
    if (next.pointerId === event.pointerId)
      setWidth(((next.clientX - bounds.left) / bounds.width) * 100)
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('pointercancel', stop)
    window.removeEventListener('blur', stop)
    stopResize = undefined
  }
  stopResize = stop
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
  window.addEventListener('pointercancel', stop)
  window.addEventListener('blur', stop)
}

onUnmounted(() => stopResize?.())
</script>

<template>
  <section class="experiment-card" aria-label="代码实验区">
    <div class="experiment-toolbar">
      <div class="file-label">
        <Icon name="code" :size="16" /><code>{{ filename }}</code><span>可编辑</span>
      </div>
      <div class="run-actions">
        <button
          class="button subtle reset-example"
          type="button"
          title="只恢复当前示例，不影响其他草稿"
          @click="emit('reset')"
        >
          <Icon name="reset" :size="15" /><span>恢复示例</span>
        </button>
        <button
          v-if="running"
          class="button secondary"
          type="button"
          @click="emit('cancelRun')"
        >
          <Icon name="close" :size="15" />取消等待
        </button>
        <button
          v-else
          class="button secondary"
          type="button"
          @click="emit('run', true)"
        >
          <Icon name="fix" :size="15" />自动修复
        </button>
        <button
          class="button primary"
          type="button"
          :disabled="running"
          @click="emit('run', false)"
        >
          <Icon name="play" :size="15" />{{ running ? "检查中…" : "运行检查"
          }}<kbd>⌘ ↵</kbd>
        </button>
      </div>
    </div>
    <div
      class="experiment-split"
      :style="{ '--editor-width': `${leftWidth}%` }"
    >
      <div id="code-pane" class="source-pane">
        <Editor
          ref="codeEditor"
          v-model="source"
          :filename="filename"
          label="实验代码编辑器"
          runnable
          @run="emit('run', false)"
        />
        <div class="editor-foot">
          <span>{{ source.split("\n").length }} 行 <i>·</i> UTF-8</span><span>Tab 缩进 · Esc 后 Tab 离开</span>
        </div>
      </div>
      <div
        class="resize-handle"
        role="separator"
        aria-label="调整代码和结果面板宽度"
        aria-orientation="vertical"
        aria-controls="code-pane"
        :aria-valuenow="leftWidth"
        :aria-valuemin="minWidth"
        :aria-valuemax="maxWidth"
        tabindex="0"
        @pointerdown="startResize"
        @keydown="resizeWithKeyboard"
      ></div>
      <section class="result-pane" aria-labelledby="result-title">
        <div class="result-heading">
          <h2 id="result-title"><Icon name="check" :size="16" />检查结果</h2>
          <span v-if="result && !stale" class="result-timing">{{ Math.round(result.durationMs) }} ms</span><span v-else class="result-label">{{
            stale ? "需重新检查" : "尚未运行"
          }}</span>
        </div>
        <div v-if="runError || metaError" class="inline-notice">
          <Icon name="info" :size="17" />
          <p>{{ runError || metaError }}</p>
          <button
            class="text-button"
            type="button"
            @click="runError ? emit('run', false) : emit('retry')"
          >
            {{ runError ? "重新检查" : "重试连接" }}
          </button>
        </div>
        <div v-if="running" class="result-placeholder" aria-busy="true">
          <span class="loader"></span><strong>正在分析代码</strong>
          <p>{{ activeConfig.name }} 正在处理当前文本。</p>
        </div>
        <template v-else-if="result">
          <div v-if="stale" class="stale-notice">
            <Icon name="info" :size="15" />代码已修改，以下为上次结果。<button
              class="text-button"
              type="button"
              @click="emit('run', false)"
            >
              重新检查
            </button>
          </div>
          <div class="result-summary">
            <span class="count-chip error">{{ errors }} 个错误</span><span class="count-chip warning">{{ warnings }} 个警告</span><span v-if="fixed && !stale" class="fixed-note">已应用修复</span>
          </div>
          <template v-if="result.diagnostics.length">
            <div class="diagnostic-filter">
              <label><span class="sr-only">诊断级别</span><select v-model="severity">
                  <option value="all">
                    全部问题（{{ result.diagnostics.length }}）
                  </option>
                  <option value="error">错误（{{ errors }}）</option>
                  <option value="warning">警告（{{ warnings }}）</option>
                </select></label><span>{{
                stale ? "重新检查后可定位" : "点击问题定位代码"
              }}</span>
            </div>
            <ul v-if="diagnostics.length" class="diagnostics" role="list">
              <li v-for="(issue, index) in diagnostics" :key="index">
                <button
                  class="diagnostic"
                  :class="issue.severity"
                  type="button"
                  :disabled="!issue.line || stale"
                  @click="issue.line && codeEditor?.focusLine(issue.line)"
                >
                  <span class="diagnostic-symbol">{{
                    issue.severity === "error" ? "×" : "!"
                  }}</span><span class="diagnostic-copy"><strong>{{ issue.rule || "语法解析" }}</strong><span>{{ issue.message }}</span><small>{{
                      issue.line
                        ? `行 ${issue.line}${issue.column ? ` : ${issue.column}` : ""}`
                        : "引擎未提供具体位置"
                    }}</small></span><Icon name="arrow" :size="14" />
                </button>
              </li>
            </ul>
            <div v-else class="result-filter-empty">
              <p>没有此级别的问题</p>
              <button
                class="text-button"
                type="button"
                @click="severity = 'all'"
              >
                查看全部问题
              </button>
            </div>
          </template>
          <div v-else class="result-placeholder success">
            <Icon name="check" :size="28" /><strong>{{
              stale ? "上次检查没有发现问题" : "检查通过"
            }}</strong>
            <p>
              {{
                stale
                  ? "重新运行以检查当前内容。"
                  : "当前文本通过了共享默认规则。"
              }}
            </p>
          </div>
        </template>
        <div v-else-if="!running" class="result-placeholder initial">
          <span class="empty-symbol"><Icon name="terminal" :size="24" /></span><strong>看看规则会发现什么</strong>
          <p>示例包含可检查的问题。<br />运行后，这里会显示诊断和代码位置。</p>
          <button
            class="button secondary"
            type="button"
            @click="emit('run', false)"
          >
            <Icon name="play" :size="14" />运行一次检查
</button><span class="shortcut-hint">Ctrl / ⌘ + Enter</span>
        </div>
      </section>
    </div>
    <div class="experiment-note">
      <span><Icon name="info" :size="14" />共享默认规则 ·
        仅分析文本，不执行代码</span><button class="text-button" type="button" @click="emit('showRules')">
        查看当前规则<Icon name="arrow" :size="13" />
      </button>
    </div>
  </section>
</template>

<style lang="scss" src="./styles.scss"></style>
