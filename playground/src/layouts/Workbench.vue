<script setup lang="ts">
import type { PlaygroundMode } from '../../types'
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { setEditorTheme } from '../components/editor/index'
import Status from '../components/status/index.vue'
import { clearCache } from '../sandbox/cache'
import { restartRuntime, runtimeLog, runtimeStates } from '../sandbox/client'
import { configurations } from '../stores/config/index'
import { useConfigStore, useExperimentStore } from '../stores/index'

const toastOpen = ref(false)
const toastText = ref('')
const route = useRoute()
const config = useConfigStore()
const experiment = useExperimentStore()
// 路由约束工具参数；先选定工具，再读取目录并准备对应引擎。
watch(() => route.params.tool, (tool) => {
  const mode = tool as PlaygroundMode
  if (config.mode === mode)
    void config.load()
  else config.selectMode(mode)
  void experiment.prepare()
}, { immediate: true })
const runtimeState = computed(() => runtimeStates[config.mode])
const restarting = ref(false)
const clearingCache = ref(false)
const cacheFeedback = ref('')
watch([
  () => config.feedback,
  cacheFeedback,
], ([feedback, cache], previous) => {
  const values = [feedback, cache]
  const changed = values.find((value, index) => value && value !== previous?.[index])
  if (!changed)
    return
  toastText.value = changed
  toastOpen.value = true
})
const resetting = ref(false)
const resetRequested = ref(false)
async function resetSandbox() {
  resetting.value = true
  resetRequested.value = false
  const mode = config.mode
  try {
    await experiment.reinstall()
    cacheFeedback.value = `${configurations[mode].name} 沙箱已重装，草稿已保留`
  }
  catch (error) {
    runtimeStates[mode] = { phase: 'error', message: '沙箱重装失败，可再次重置重试' }
    cacheFeedback.value = String(error)
    runtimeLog.value += `[${mode}] 重装失败：${String(error)}\n`
  }
  finally { resetting.value = false }
}
async function restart() {
  restarting.value = true
  try {
    await restartRuntime(config.mode, config.draft.filename)
  }
  catch (error) {
    runtimeStates[config.mode] = { phase: 'error', message: '检查服务重启失败，请查看 Console 后重试' }
    runtimeLog.value += `${String(error)}\n`
  }
  finally {
    restarting.value = false
  }
}
async function clearSandboxCache() {
  if (clearingCache.value)
    return
  clearingCache.value = true
  cacheFeedback.value = ''
  try {
    const count = await clearCache()
    cacheFeedback.value = count
      ? `已清理 ${count} 个沙箱缓存`
      : '没有可清理的沙箱缓存'
    runtimeLog.value += `[cache] ${cacheFeedback.value}；当前服务仍在运行\n`
  }
  catch (error) {
    cacheFeedback.value = `清理沙箱缓存失败：${String(error)}`
  }
  finally { clearingCache.value = false }
}
function focusWorkspace() {
  document.getElementById('workspace')?.focus()
}
const dark = ref(false)
const views = [
  { name: 'overview', label: '配置总览', icon: 'i-lucide-layers' },
  { name: 'rules', label: '规则目录', icon: 'i-lucide-list-filter' },
  { name: 'files', label: '文件匹配', icon: 'i-lucide-files' },
  { name: 'experiment', label: '代码实验', icon: 'i-lucide-flask-conical' },
  { name: 'stats', label: '统计与性能', icon: 'i-lucide-chart-no-axes-combined' },
  { name: 'setup', label: '项目接入', icon: 'i-lucide-terminal' },
]
</script>

<template>
  <div class="workbench font-sans antialiased" :class="{ dark }">
    <TooltipProvider :delay-duration="300">
      <ToastProvider label="操作通知">
        <a class="skip" href="#" @click.prevent="focusWorkspace">跳到工作区</a>
        <header class="topbar">
          <RouterLink class="brand" :to="{ name: 'overview', params: { tool: config.mode } }">
            <span class="brand-icon i-lucide-braces" aria-hidden="true" />
            <strong>Lint Config</strong>
            <span class="brand-slash">/</span>
            <span class="brand-caption">Playground</span>
          </RouterLink>
          <NavigationMenuRoot class="tool-switch" aria-label="检查工具">
            <NavigationMenuList class="navigation-list">
              <NavigationMenuItem v-for="(item, key) in configurations" :key="key">
                <NavigationMenuLink as-child :active="config.mode === key">
                  <RouterLink :class="{ active: config.mode === key }" :to="{ name: route.name!, params: { tool: key } }" :aria-current="config.mode === key ? 'page' : undefined">
                    <span class="tool-dot" />{{ item.name }}
                  </RouterLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenuRoot>
          <div class="top-actions">
            <a :href="config.active.docs" target="_blank" rel="noreferrer">
              <span class="i-lucide-book-open" aria-hidden="true" /> 文档</a>
            <a href="https://github.com/zzjtnb/zzjtnb-lint-config" target="_blank" rel="noreferrer" aria-label="项目 GitHub">
              <span class="i-lucide-github" aria-hidden="true" />
            </a>
            <button :aria-label="dark ? '切换浅色' : '切换深色'" @click="dark = !dark;setEditorTheme(dark)">
              <span :class="dark ? 'i-lucide-moon' : 'i-lucide-sun'" aria-hidden="true" />
            </button>
          </div>
        </header>
        <main id="workspace" tabindex="-1" class="workspace" :aria-label="views.find(view => view.name === route.name)?.label">
          <NavigationMenuRoot class="workspace-nav" aria-label="工作区导航">
            <NavigationMenuList class="navigation-list">
              <NavigationMenuItem v-for="view in views" :key="view.name">
                <NavigationMenuLink as-child :active="route.name === view.name">
                  <RouterLink :to="{ name: view.name, params: { tool: config.mode } }" active-class="active">
                    <span :class="view.icon" aria-hidden="true" />{{ view.label }}
                  </RouterLink>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
            <DropdownMenuRoot>
              <DropdownMenuTrigger class="btn export-trigger" aria-label="导出配置">
                <span class="i-lucide-download" aria-hidden="true" />导出配置<span class="i-lucide-chevron-down" aria-hidden="true" />
              </DropdownMenuTrigger><DropdownMenuPortal to=".workbench">
                <DropdownMenuContent class="export-menu" align="end" :side-offset="6">
                  <DropdownMenuItem class="export-menu-item" @select="config.download('current')">
                    <span class="i-lucide-flask-conical" aria-hidden="true" /><span>导出当前实验配置<small>完整源码与当前规则覆盖</small></span>
                  </DropdownMenuItem><DropdownMenuItem class="export-menu-item" @select="config.download('default')">
                    <span class="i-lucide-package" aria-hidden="true" /><span>导出默认配置<small>共享包初始配置，不包含实验改动</small></span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
          </NavigationMenuRoot>
          <section class="surface">
            <div class="context-bar">
              <div>
                <span class="i-lucide-package" aria-hidden="true" />
                <code>{{ config.active.packageName }}</code>
              </div>
              <div>
                <div class="sandbox-progress">
                  <PopoverRoot>
                    <PopoverTrigger class="sandbox-status-trigger">
                      <span class="i-lucide-boxes" aria-hidden="true" />三个工具准备状态 <span class="tag">{{ Object.values(runtimeStates).filter(state => state.phase === 'ready').length }} / 3 就绪</span>
                    </PopoverTrigger>
                    <PopoverPortal to=".workbench">
                      <PopoverContent class="sandbox-status-panel" align="end" :side-offset="8" :collision-padding="12">
                        <ul>
                          <li v-for="(item, key) in configurations" :key="key">
                            <RouterLink :to="{ name: route.name!, params: { tool: key } }">{{ item.name }}</RouterLink>
                            <Status :state="runtimeStates[key]" />
                          </li>
                        </ul>
                        <p>清理沙箱：删除三个工具的本地依赖缓存，当前服务继续运行。重置沙箱：重新安装当前工具依赖并启动服务。重启沙箱：只重启当前工具进程，复用已安装依赖。三项均保留配置与代码草稿。</p><p>当前工具优先准备，随后依次在后台准备其他工具；后台未完成时切换仍需等待。</p>
                      </PopoverContent>
                    </PopoverPortal>
                  </PopoverRoot>
                </div>
                <ProgressRoot v-if="experiment.preparing || experiment.running" :model-value="null" class="runtime-progress" aria-label="当前工具正在准备或执行">
                  <ProgressIndicator />
                </ProgressRoot>
                <Status role="status" class="runtime-state" :state="runtimeState" compact />
                <div class="sandbox-actions" role="group" aria-label="沙箱操作">
                  <button v-if="runtimeState.phase === 'preparing'" class="btn" :disabled="resetting || restarting" @click="experiment.cancelPrepare">
                    <span class="i-lucide-circle-stop" aria-hidden="true" />取消准备
                  </button>
                  <button v-if="['error', 'cancelled'].includes(runtimeState.phase) && !experiment.running && !experiment.preparing" class="btn" @click="experiment.prepare">
                    <span class="i-lucide-play" aria-hidden="true" />重新准备
                  </button>
                  <TooltipRoot>
                    <TooltipTrigger as-child>
                      <button class="btn" :disabled="clearingCache || resetting" @click="clearSandboxCache">
                        <span class="i-lucide-database-backup" aria-hidden="true" />{{ clearingCache ? '清理中…' : '清理沙箱' }}
                      </button>
                    </TooltipTrigger><TooltipPortal to=".workbench">
                      <TooltipContent class="ui-tooltip" :side-offset="6">
                        清理三个工具的本地依赖缓存，当前服务与草稿保留
                      </TooltipContent>
                    </TooltipPortal>
                  </TooltipRoot>
                  <TooltipRoot>
                    <TooltipTrigger as-child>
                      <button class="btn" :disabled="experiment.running || experiment.preparing || resetting || restarting" @click="resetRequested = !resetRequested">
                        <span class="i-lucide-package-open" aria-hidden="true" />{{ resetting ? '重装中…' : '重置沙箱' }}
                      </button>
                    </TooltipTrigger><TooltipPortal to=".workbench">
                      <TooltipContent class="ui-tooltip" :side-offset="6">
                        移除当前工具缓存与依赖后重新安装，保留代码和配置
                      </TooltipContent>
                    </TooltipPortal>
                  </TooltipRoot>
                  <TooltipRoot>
                    <TooltipTrigger as-child>
                      <button class="btn" :disabled="experiment.running || experiment.preparing || restarting || resetting" @click="restart">
                        <span class="i-lucide-refresh-cw" aria-hidden="true" />重启沙箱
                      </button>
                    </TooltipTrigger><TooltipPortal to=".workbench">
                      <TooltipContent class="ui-tooltip" :side-offset="6">
                        只重启当前工具服务，复用已安装依赖
                      </TooltipContent>
                    </TooltipPortal>
                  </TooltipRoot>
                </div>
              </div>
            </div>
            <AlertDialogRoot v-model:open="resetRequested">
              <AlertDialogPortal to=".workbench">
                <AlertDialogOverlay class="dialog-overlay" /><AlertDialogContent class="dialog-content">
                  <AlertDialogTitle>重装 {{ config.active.name }} 沙箱？</AlertDialogTitle><AlertDialogDescription>重新安装当前工具依赖并重启服务，需要联网。配置与代码草稿保留。</AlertDialogDescription><div class="dialog-actions">
                    <AlertDialogCancel class="btn">
                      取消重装
                    </AlertDialogCancel><AlertDialogAction class="btn primary" @click="resetSandbox">
                      确认重装
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialogPortal>
            </AlertDialogRoot>

            <p v-if="config.error" role="alert" class="notice error">
              {{ config.error }} <button @click="config.load">
                重新读取
              </button>
            </p>
            <RouterView v-slot="{ Component }">
              <KeepAlive>
                <component :is="Component" v-bind="route.name === 'overview' || route.name === 'stats' ? { dark } : {}" />
              </KeepAlive>
            </RouterView>
          </section>
          <footer class="workspace-footer">
            <span>
              <span class="i-lucide-shield-check" aria-hidden="true" />配置在浏览器沙箱中执行，示例源码只用于检查</span>
            <span>规则目录显示默认配置；解析后可查看当前文件的最终规则</span>
          </footer>
        </main>
        <ToastRoot v-model:open="toastOpen" class="ui-toast">
          <ToastDescription>{{ toastText }}</ToastDescription><ToastClose class="btn" aria-label="关闭通知">
            关闭
          </ToastClose>
        </ToastRoot><ToastViewport class="toast-viewport" label="操作通知" />
      </ToastProvider>
    </TooltipProvider>
  </div>
</template>

<style lang="scss">
@use '../../../docs/.vitepress/theme/styles/variables';

.workbench {
  --page: var(--vp-c-bg);
  --surface: var(--vp-c-bg-elv);
  --soft: var(--vp-c-bg);
  --well: var(--vp-c-bg-alt);
  --line: var(--vp-c-divider);
  --accent: var(--vp-c-brand-1);
  --brand-soft: var(--vp-c-brand-soft);
  --text: #3c3c43;
  --muted: #67676f;
  --success: #286747;
  --warning: #825a14;
  --danger: #a13550;
  --purple: #7147a0;
  --teal: #246c67;
  --header-offset:88px;

  min-height:100vh;
  font-size:14px;
  color:var(--text);
  background:var(--page);

  &.dark {
    --text:#dfdfe3;
    --muted:#a3a3ad;
    --success:#8ed0ad;
    --warning:#f2ca80;
    --danger:#ffa5b3;
    --purple:#c9a1f0;
    --teal:#8bd4cd;

    color-scheme:dark;
  }

  :where(button,input,select,textarea) {
font:inherit;
}

  button {
cursor:pointer;
}

  button:disabled {
cursor:not-allowed;
opacity:.5;
}

  input,select,textarea {
color:var(--text);
background:var(--surface);
}

  code,pre {
font-family:var(--font-mono);
}

  pre {
overflow-wrap:anywhere;
white-space:pre-wrap;
}

  h2 {
font-size:16px;
font-weight:650;
}

  h3 {
font-size:13px;
font-weight:600;
}

  [class*='i-lucide-'] {
width:16px;
height:16px;
}

  :where(a,button,input,select,textarea,summary):focus-visible {
outline:2px solid var(--accent);
outline-offset:3px;
}

  input:focus-visible,textarea:focus-visible {
outline:none;
border-color:var(--accent);
box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 22%,transparent);
}

  .matching-form input:focus-visible {
box-shadow:none;
}

  .monaco-editor .margin-view-overlays .line-numbers {
color:var(--muted);
}

  .monaco-editor .margin-view-overlays .line-numbers.active-line-number {
color:var(--text);
}

  .configuration,.setup-content section[id] {
scroll-margin-top:var(--header-offset);
}

  .btn > [class*='i-lucide-'],.text-link > [class*='i-lucide-'],h2 > [class*='i-lucide-'],h3 > [class*='i-lucide-'] {
margin-right:3px;
}
}

.skip {
position:fixed;
top:-60px;
z-index:100;
padding:12px;
background:var(--surface);
}

.skip:focus {
top:0;
}

.topbar {
position:sticky;
top:0;
z-index:30;
display:flex;
gap:32px;
align-items:center;
min-height:56px;
padding:10px 20px;
background:var(--site-nav-glass);
border-bottom:1px solid var(--line);
backdrop-filter:blur(16px);
}

.brand {
display:flex;
gap:10px;
align-items:center;
font-size:16px;
letter-spacing:-.4px;
white-space:nowrap;
}

.brand .brand-icon {
width:26px;
height:26px;
color:var(--accent);
}

.brand-slash {
color:var(--line);
}

.brand-caption {
font-size:12px;
color:var(--muted);
}

.navigation-list {
display:flex;
gap:4px;
align-items:center;
padding:0;
margin:0;
list-style:none;
}

.tool-switch {
display:flex;
gap:4px;
padding:4px;
background:var(--well);
border-radius:9px;
}

.tool-switch a {
display:flex;
gap:7px;
align-items:center;
padding:7px 14px;
font-size:12px;
color:var(--muted);
border-radius:6px;
}

.tool-switch a.active {
color:var(--accent);
background:var(--surface);
box-shadow:0 1px 4px rgb(0 0 0 / 6%);
}

.tool-dot {
width:5px;
height:5px;
background:currentcolor;
border-radius:50%;
}

.top-actions {
display:flex;
gap:20px;
align-items:center;
margin-left:auto;
font-size:12px;
color:var(--muted);
}

.top-actions a {
display:flex;
gap:6px;
align-items:center;
}

.workspace {
max-width:1920px;
padding:0 18px;
margin:0 auto;
}

.btn {
display:inline-flex;
gap:6px;
align-items:center;
justify-content:center;
padding:8px 12px;
font-size:12px;
line-height:1.5;
white-space:nowrap;
background:var(--surface);
border:1px solid var(--line);
border-radius:7px;
transition:background .15s,border-color .15s;
}

.btn:hover {
background:var(--well);
border-color:var(--accent);
}

.btn.primary {
color:var(--vp-button-brand-text);
background:var(--vp-button-brand-bg);
border-color:var(--vp-button-brand-bg);
}

.btn.primary:hover {
background:var(--vp-button-brand-hover-bg);
}

.tag {
display:inline-flex;
gap:4px;
align-items:center;
padding:3px 7px;
font-size:10px;
line-height:1.4;
color:var(--muted);
background:var(--well);
border-radius:5px;
}

.tag.amber {
color:#825a14;
background:#fff3dd;
}

.tag.blue {
color:var(--accent);
background:var(--brand-soft);
}

.tag.red {
color:#a13550;
background:#fff0f2;
}

.tag.green {
color:#286747;
background:#eaf6ef;
}

.workspace-nav {
display:flex;
gap:5px;
min-height:44px;
margin:16px 0;
overflow-x:auto;
border-bottom:1px solid var(--line);
}

.workspace-nav a {
display:flex;
flex-shrink:0;
gap:8px;
align-items:center;
padding:12px 16px;
font-size:13px;
color:var(--muted);
border-bottom:2px solid transparent;
}

.workspace-nav a:hover {
color:var(--text);
background:var(--well);
border-radius:7px 7px 0 0;
}

.workspace-nav a.active {
color:var(--accent);
border-bottom-color:var(--accent);
}

.surface {
min-width:0;
}

.context-bar {
display:flex;
flex-wrap:wrap;
gap:12px;
align-items:center;
justify-content:space-between;
padding:8px 10px;
background:var(--surface);
border:1px solid var(--line);
border-radius:10px;
}

.context-bar > div {
display:flex;
flex-wrap:wrap;
gap:10px;
align-items:center;
}

.context-bar code,.context-bar label {
font-size:11px;
}

.context-bar label {
color:var(--muted);
}

.runtime-state {
font-size:10px;
}

.sandbox-actions {
display:flex;
flex-wrap:wrap;
gap:7px;
justify-content:flex-end;
margin-left:auto;
}

.sandbox-actions .btn {
font-size:11px;
}

.sandbox-progress {
position:relative;
padding:0;
margin:0;
font-size:11px;
color:var(--muted);
background:var(--surface);
border:0;
}

.sandbox-status-trigger {
cursor:pointer;
}

.sandbox-status-panel ul {
display:grid;
gap:10px;
margin:12px 0;
list-style:none;
}

.sandbox-status-panel li {
display:flex;
gap:10px;
align-items:center;
}

.sandbox-status-panel a {
min-width:90px;
color:var(--accent);
}

.sandbox-status-panel p {
line-height:1.8;
}

.workspace-footer {
display:flex;
flex-wrap:wrap;
gap:14px;
justify-content:space-between;
padding:20px 0;
font-size:10px;
color:var(--muted);
}

.workspace-footer > span {
display:inline-flex;
gap:6px;
align-items:center;
}

.workspace-footer [class*='i-'] {
width:12px;
height:12px;
}

.panel {
min-width:0;
padding:16px;
background:var(--surface);
border:1px solid var(--line);
border-radius:12px;
}

.section-heading {
display:flex;
flex-wrap:wrap;
gap:12px;
align-items:center;
justify-content:space-between;
margin-bottom:17px;
}

.search-input {
width:100%;
padding:9px 11px;
font-size:12px !important;
border:1px solid var(--line);
border-radius:6px;
}

.notice {
padding:12px 14px;
margin:14px 0;
font-size:12px;
line-height:1.8;
color:var(--muted);
overflow-wrap:anywhere;
background:var(--well);
border:1px solid var(--line);
border-radius:7px;
}

.notice.error {
color:var(--danger);
background:color-mix(in srgb,var(--danger) 6%,var(--surface));
}

.empty {
padding:38px 15px;
font-size:12px;
line-height:1.8;
color:var(--muted);
text-align:center;
}

.text-link {
color:var(--accent);
}

.scope-note {
margin-bottom:16px;
font-size:11px;
line-height:1.8;
color:var(--muted);
}

.metric-grid {
display:grid;
grid-template-columns:repeat(4,minmax(0,1fr));
gap:10px;
margin:0 0 10px;
}

.metric-grid > div {
display:grid;
grid-template-columns:44px 1fr;
gap:5px 12px;
align-items:center;
min-width:0;
padding:20px;
background:var(--surface);
border:1px solid var(--line);
border-radius:12px;
}

.metric-grid .metric-icon {
display:grid;
grid-row:span 2;
place-items:center;
width:40px;
height:40px;
color:var(--accent);
background:var(--brand-soft);
border-radius:12px;
}

.metric-grid .metric-icon [class*='i-'] {
width:20px;
height:20px;
}

.metric-grid > div:nth-child(1) .metric-icon {
color:var(--purple);
background:color-mix(in srgb,var(--purple) 10%,transparent);
}

.metric-grid > div:nth-child(2) .metric-icon {
color:var(--success);
background:color-mix(in srgb,var(--success) 10%,transparent);
}

.metric-grid strong {
font-size:26px;
font-weight:650;
font-variant-numeric:tabular-nums;
line-height:1.15;
}

.metric-grid > div > span:last-child {
font-size:11px;
color:var(--muted);
}

@media(width <=1200px) {
  .brand-caption,.brand-slash {
display:none;
}

  .topbar {
gap:20px;
}
}

@media(width <=700px) {
.workbench {
--header-offset:124px;
}

  .topbar {
flex-wrap:wrap;
gap:12px;
padding:12px 16px;
}

  .tool-switch {
order:3;
width:100%;
}

  .tool-switch a {
flex:1;
justify-content:center;
}

  .top-actions {
gap:14px;
}

  .workspace {
padding:0 10px;
}

  .workspace-nav {
margin-top:0;
}

  .workspace-nav a {
padding:11px 13px;
font-size:12px;
}

  .context-bar > div {
width:100%;
}

  .sandbox-actions {
width:100%;
}

  .metric-grid {
grid-template-columns:repeat(2,minmax(0,1fr));
gap:10px;
}

  .metric-grid > div {
grid-template-columns:32px 1fr;
gap:5px 8px;
padding:14px;
}

  .metric-grid .metric-icon {
width:30px;
height:30px;
border-radius:8px;
}

  .metric-grid strong {
font-size:23px;
}

  .panel {
padding:16px;
}
}

.export-trigger {
flex-shrink:0;
align-self:center;
margin-left:auto;
}

.export-menu {
z-index:80;
min-width:255px;
padding:5px;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
box-shadow:0 8px 30px rgb(0 0 0 / 12%);
}

.export-menu-item {
display:flex;
gap:10px;
align-items:center;
padding:10px;
font-size:12px;
cursor:pointer;
outline:none;
border-radius:5px;
}

.export-menu-item[data-highlighted] {
color:var(--accent);
background:var(--brand-soft);
}

.menu-separator {
height:1px;
margin:4px 0;
background:var(--line);
}

.file-context-menu [data-disabled] {
opacity:.5;
}

.rule-menu-label {
display:block;
padding:8px;
font-size:11px;
color:var(--muted);
border-top:1px solid var(--line);
}

.export-menu-item small {
display:block;
margin-top:4px;
font-size:11px;
color:var(--muted);
}

.sandbox-status-panel ul,.sandbox-status-panel p {
padding:0 10px;
}

.context-bar {
margin-bottom:10px;
}

@media(width <=700px) {
.export-trigger {
padding:6px 8px;
} }

.sandbox-status-panel {
z-index:50;
width:360px;
max-width:calc(100vw - 24px);
padding:10px;
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
box-shadow:0 8px 30px rgb(0 0 0 / 12%);
}
</style>

<style lang="scss">
.workbench {
  .dialog-overlay {
position:fixed;
inset:0;
z-index:100;
background:rgb(0 0 0 / 45%);
}

  .dialog-content {
position:fixed;
top:50%;
left:50%;
z-index:101;
width:min(440px,calc(100vw - 32px));
padding:24px;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:12px;
transform:translate(-50%,-50%);
}

  .dialog-content h2 {
margin-bottom:12px;
font-size:18px;
}

  .dialog-actions {
display:flex;
gap:8px;
justify-content:flex-end;
margin-top:20px;
}

  .ui-switch {
width:34px;
height:20px;
padding:2px;
background:var(--muted);
border-radius:20px;
}

  .ui-switch[data-state='checked'] {
background:var(--accent);
}

  .ui-switch-thumb {
display:block;
width:16px;
height:16px;
background:var(--surface);
border-radius:50%;
transition:transform .15s;
}

  .ui-switch-thumb[data-state='checked'] {
transform:translateX(14px);
}

  .ui-checkbox {
display:inline-flex;
width:16px;
height:16px;
margin-right:6px;
vertical-align:middle;
border:1px solid var(--line);
border-radius:3px;
}

  .ui-checkbox[data-state='checked'] {
color:var(--surface);
background:var(--accent);
}

  .file-tree .tree-name {
min-width:0;
overflow-wrap:anywhere;
}

.file-tree {
padding:8px;
margin:0;
list-style:none;
border:1px solid var(--line);
border-radius:8px;
}

  .file-tree [role='treeitem'] {
display:flex;
gap:8px;
align-items:center;
min-height:34px;
cursor:pointer;
border-radius:4px;
}

  .file-tree [role='treeitem']:focus-visible,.file-tree [data-selected] {
outline:2px solid var(--accent);
outline-offset:-2px;
background:var(--brand-soft);
}

  .step-trigger {
display:flex;
gap:10px;
align-items:center;
width:100%;
padding:12px 8px;
text-align:left;
border-radius:6px;
}

  .step-trigger[data-state='active'] {
color:var(--accent);
background:var(--brand-soft);
}

  .ui-tooltip {
z-index:110;
max-width:300px;
padding:7px 10px;
font-size:12px;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:6px;
box-shadow:0 4px 20px rgb(0 0 0 / 15%);
}

  .toast-viewport {
position:fixed;
right:20px;
bottom:20px;
z-index:120;
width:min(380px,calc(100vw - 40px));
list-style:none;
}

  .ui-toast {
display:flex;
gap:12px;
align-items:center;
justify-content:space-between;
padding:14px;
color:var(--text);
background:var(--surface);
border:1px solid var(--line);
border-radius:8px;
box-shadow:0 8px 30px rgb(0 0 0 / 15%);
}

  .runtime-progress {
width:52px;
height:4px;
overflow:hidden;
background:var(--line);
border-radius:4px;
}

  .runtime-progress > div {
width:40%;
height:100%;
background:var(--accent);
animation:runtime-pending 1.2s infinite alternate;
}
}

@keyframes runtime-pending {
to {
transform:translateX(150%);
} }

@media (prefers-reduced-motion:reduce) { .workbench .runtime-progress > div {
animation:none;
} }
</style>
