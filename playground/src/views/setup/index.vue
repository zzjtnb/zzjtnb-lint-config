<script setup lang="ts">
import { computed } from 'vue'
import Code from '../../components/code/index.vue'
import { useConfigStore, useExperimentStore } from '../../stores/index'

const steps = [
  { id: 'install', label: '安装依赖' },
  { id: 'save', label: '保存配置' },
  { id: 'scripts', label: '添加检查脚本' },
  { id: 'verify', label: '运行与修复' },
]

/** Reka 的状态事件同时覆盖鼠标和键盘激活，不依赖被键盘默认处理阻止的 click。 */
function scrollToStep(step: number | undefined) {
  // Reka 的事件契约包含未选中的状态，此时保留页面阅读位置。
  if (step === undefined)
    return
  document.getElementById(steps[step - 1]!.id)?.scrollIntoView({ behavior: 'smooth' })
}
const config = useConfigStore()
const experiment = useExperimentStore()
const exported = computed(() => {
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
const scripts = computed(() => JSON.stringify({
  scripts: {
    [`lint:${config.mode}`]: config.active.scripts.lint,
    [`format:${config.mode}`]: config.active.scripts.format,
  },
}, null, 2))
</script>

<template>
  <section class="setup-layout">
    <aside class="setup-steps">
      <StepperRoot :linear="false" orientation="vertical" aria-label="项目接入步骤" @update:model-value="scrollToStep">
        <StepperItem v-for="(step, index) in steps" :key="step.id" :step="index + 1">
          <StepperTrigger class="step-trigger">
            <StepperIndicator class="tag">
              {{ index + 1 }}
            </StepperIndicator><StepperTitle>{{ step.label }}</StepperTitle>
          </StepperTrigger>
        </StepperItem>
      </StepperRoot><small>按步骤在你的项目中安装和使用配置。</small>
      <div class="notice">
        导出包含当前完整源码和所有规则覆盖，不受规则目录筛选影响。
      </div>
    </aside>
    <section class="setup-content">
      <div class="section-heading">
        <h2><span class="i-lucide-package-check" aria-hidden="true" />导出配置并接入项目</h2>
      </div>
      <p class="setup-description">
        共享包提供默认规则，你可以追加项目规则覆盖。导出后，在项目中安装依赖、保存配置并运行检查。
      </p>
      <p class="notice" :class="{ error: !!exported.error }">
        {{ exported.error || (experiment.current && !experiment.error && !experiment.stale && !experiment.current.result.ignored && experiment.current.action !== 'stats' ? '当前配置已用于检查当前文件；项目中的其他文件需要在接入后检查。' : '当前配置尚未完成对当前文件的检查。你可以先运行检查，也可以导出后在项目中检查。') }}
      </p>
      <section id="install">
        <div class="section-heading">
          <h3>01 安装依赖</h3>
          <button class="text-link" @click="config.copy(config.active.install)">
            <span class="i-lucide-copy" aria-hidden="true" />复制命令
          </button>
        </div>
        <pre>{{ config.active.install }}</pre>
      </section>
      <section id="save">
        <div class="section-heading">
          <h3>02 保存为 {{ config.active.configFile }}</h3>
          <button class="text-link" :disabled="!!exported.error" @click="config.copy(exported.text)">
            <span class="i-lucide-copy" aria-hidden="true" />复制完整配置
          </button>
        </div>
        <Code v-if="!exported.error" :code="exported.text" language="javascript" label="完整配置代码" /><p v-else role="alert" class="notice error">
          {{ exported.error }}
        </p>
        <p v-if="config.mode !== 'markdownlint'" class="notice">
          在项目的 <code>package.json</code> 中声明 <code>"type": "module"</code>，使下载的 JavaScript 配置按 ESM 加载。
        </p>
        <p v-if="config.mode === 'markdownlint'" class="notice">
          导出为 CLI2 支持的 <code>markdownlint-cli2.mjs</code>，规则位于 <code>config</code> 内，扫描与忽略设置位于外层。删除或合并同目录旧的 <code>.markdownlint.*</code> 规则文件，避免覆盖此规则源。
        </p>
      </section>
      <section id="scripts">
        <div class="section-heading">
          <h3>03 添加到 package.json</h3>
          <button class="text-link" @click="config.copy(scripts)">
            <span class="i-lucide-copy" aria-hidden="true" />复制脚本
          </button>
        </div>
        <Code :code="scripts" label="package.json 脚本" />
      </section>
      <section id="verify">
        <h3>04 在项目中检查与修复</h3>
        <pre class="mt-4">pnpm run lint:{{ config.mode }}
pnpm run format:{{ config.mode }}</pre>
        <p class="notice">
          将上述脚本合并到现有 package.json，保留已有脚本。自动修复后仍可能有需要手动处理的问题。
        </p>
        <button class="text-link mt-4" @click="config.copy(`pnpm run lint:${config.mode}\npnpm run format:${config.mode}`)">
          <span class="i-lucide-copy" aria-hidden="true" />复制运行命令
        </button>
        <a :href="config.active.docs" target="_blank" rel="noreferrer" class="text-link mt-5 inline-block">查看正式配置文档 ↗</a>
      </section>
    </section>
    <aside class="setup-export panel">
      <span class="i-lucide-package-check" aria-hidden="true" /><h3>带回你的项目</h3><p>包含完整配置源码和所有规则覆盖。</p><code>{{ config.active.configFile }}</code><button class="btn primary" :disabled="!!exported.error" @click="config.download()">
        <span class="i-lucide-download" aria-hidden="true" />下载配置
      </button><p>下载后按左侧步骤接入；代码草稿与检查结果不会写入配置文件。</p><a :href="config.active.docs" target="_blank" rel="noreferrer"><span class="i-lucide-book-open" aria-hidden="true" />查看正式包文档</a>
    </aside>
  </section>
</template>

<style scoped lang="scss">
.setup-export {
position:sticky;
top:86px;
display:grid;
gap:14px;
}

.setup-export > [class*='i-'] {
width:30px;
height:30px;
color:var(--accent);
}

.setup-export p {
font-size:12px;
line-height:1.8;
color:var(--muted);
}

.setup-export code {
padding:10px;
font-size:11px;
overflow-wrap:anywhere;
background:var(--well);
border-radius:6px;
}

.setup-export a {
font-size:12px;
color:var(--accent);
}

@media(width <=700px) {
.setup-export {
margin-top:16px;
} }

.setup-layout{
display:grid;
grid-template-columns:190px minmax(0,1fr) 250px;
gap:20px;
align-items:start;
min-height:680px;
}

.setup-steps{
padding:27px 16px;
background:var(--surface);
border:1px solid var(--line);
border-radius:12px;

>a{
display:block;
padding:13px 10px;
font-size:12px;
color:var(--muted);

&:hover{
color:var(--accent);
background:var(--page);
border-radius:5px;
}
}
}

.setup-content{
min-width:0;
max-width:1100px;
padding:24px;
background:var(--surface);
border:1px solid var(--line);
border-radius:12px;

h2{
font-size:17px;
}

section{
margin-top:27px;
}

pre{
padding:19px;
overflow:auto;
font-size:12px;
line-height:1.9;
background:var(--page);
border:1px solid var(--line);
border-radius:7px;
}
}

.setup-description{
margin:14px 0 22px;
font-size:12px;
line-height:1.9;
color:var(--muted);
}

.text-link{
font-size:11px;
color:var(--accent);
}

@media(width <=700px){
.setup-layout{
display:block;
}

.setup-steps{
display:flex;
gap:6px;
padding:10px;
overflow:auto;
border-right:0;
border-bottom:1px solid var(--line);

>a{
padding:8px;
font-size:10px;
white-space:nowrap;
}

.notice{
display:none;
}
}

.setup-content{
padding:20px;
}

.section-heading{
flex-wrap:wrap;
}
}

@media(width <=1100px) {
.setup-layout {
grid-template-columns:170px minmax(0,1fr);
}

 .setup-export {
position:static;
grid-column:2;
} }
</style>
