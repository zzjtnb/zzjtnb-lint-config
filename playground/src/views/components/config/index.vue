<script setup lang="ts">
import type { PlaygroundConfig, PlaygroundMode } from '../../../../types'
import Editor from '../editor/index.vue'
import Icon from '../Icon.vue'

defineProps<{
  // 当前工具的安装命令、配置文件名与说明。
  activeConfig: PlaygroundConfig
  mode: PlaygroundMode
  // 最近复制成功的目标标识，用于短暂显示已复制状态；空字符串表示无。
  copiedTarget: string
}>()
const emit = defineEmits<{
  // 恢复当前工具的示例配置草稿。
  reset: []
  // text 为要复制的内容，target 标识触发复制的按钮。
  copy: [text: string, target: string]
}>()
const draft = defineModel<string>({ required: true })
</script>

<template>
  <section class="setup-layout" aria-label="配置接入">
    <aside class="setup-guide" aria-labelledby="setup-title">
      <div class="setup-guide-heading">
        <Icon name="terminal" :size="18" />
        <h2 id="setup-title">在你的项目中使用</h2>
      </div>
      <ol class="setup-steps">
        <li>
          <span class="step-number">1</span>
          <div>
            <h3>安装依赖</h3>
            <p>在项目根目录运行以下命令。</p>
            <div class="command-block">
              <code>{{ activeConfig.install }}</code><button
                class="icon-button"
                type="button"
                :aria-label="
                  copiedTarget === 'install' ? '安装命令已复制' : '复制安装命令'
                "
                @click="emit('copy', activeConfig.install, 'install')"
              >
                <Icon
                  :name="copiedTarget === 'install' ? 'check' : 'copy'"
                  :size="15"
                />
              </button>
            </div>
          </div>
        </li>
        <li>
          <span class="step-number">2</span>
          <div>
            <h3>创建配置文件</h3>
            <p>将右侧配置保存到项目根目录：</p>
            <code class="setup-filename">{{ activeConfig.configFile }}</code>
            <p>可以直接编辑草稿，再复制到项目。</p>
          </div>
        </li>
        <li>
          <span class="step-number">3</span>
          <div>
            <h3>运行检查</h3>
            <p>使用项目自己的配置检查实际文件。</p>
            <div class="command-block">
              <code>{{ activeConfig.command }}</code><button
                class="icon-button"
                type="button"
                :aria-label="
                  copiedTarget === 'command'
                    ? '检查命令已复制'
                    : '复制项目检查命令'
                "
                @click="emit('copy', activeConfig.command, 'command')"
              >
                <Icon
                  :name="copiedTarget === 'command' ? 'check' : 'copy'"
                  :size="15"
                />
              </button>
            </div>
          </div>
        </li>
      </ol>
      <a
        class="docs-link"
        :href="activeConfig.docs"
        target="_blank"
        rel="noreferrer"
        ><Icon name="book" :size="16" />完整配置与覆盖方式<Icon
          name="external"
          :size="13"
      /></a>
    </aside>
    <div class="setup-editor-card">
      <div class="card-heading">
        <div class="config-file-title">
          <Icon name="code" :size="16" /><code>{{
            activeConfig.configFile
          }}</code><span class="small-badge">{{
            draft === activeConfig.config ? "默认配置" : "已编辑"
          }}</span>
        </div>
        <div class="config-actions">
          <button
            class="icon-button"
            type="button"
            aria-label="恢复当前配置草稿"
            title="恢复当前配置草稿"
            @click="emit('reset')"
          >
            <Icon name="reset" :size="16" />
</button><button
            class="button secondary"
            type="button"
            @click="emit('copy', draft, 'config')"
          >
            <Icon
              :name="copiedTarget === 'config' ? 'check' : 'copy'"
              :size="15"
            />{{ copiedTarget === "config" ? "已复制" : "复制配置" }}
          </button>
        </div>
      </div>
      <Editor
        v-model="draft"
        :filename="activeConfig.configFile"
        label="配置草稿编辑器"
      />
      <div class="config-note">
        <Icon name="info" :size="15" /><span>此草稿用于接入项目，不会在运行器中执行，也不影响代码实验的规则。</span>
      </div>
    </div>
  </section>
</template>

<style lang="scss" src="./styles.scss"></style>
