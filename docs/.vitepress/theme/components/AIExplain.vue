<script setup>
import { ref, reactive, onMounted } from 'vue'
import { inBrowser } from 'vitepress'
import { getAIConfig, setAIConfig, hasAIKey, chatAI, buildMessages } from '../ai'

const props = defineProps({
  title: { type: String, default: '' },
  answer: { type: String, default: '' },
  why: { type: String, default: '' },
})

const cfg = reactive({ baseUrl: '', model: '', key: '' })
const showSettings = ref(false)
const loading = ref(false)
const error = ref('')
const result = ref('')

function load() {
  if (!inBrowser) return
  Object.assign(cfg, getAIConfig())
}
onMounted(load)

const configured = () => !!(cfg.key || '').trim()

function save() {
  setAIConfig({ baseUrl: cfg.baseUrl, model: cfg.model, key: cfg.key })
  error.value = ''
  showSettings.value = false
}

async function generate() {
  if (!inBrowser) return
  if (!configured()) { showSettings.value = true; return }
  error.value = ''
  result.value = ''
  loading.value = true
  try {
    const messages = buildMessages(props.title, props.answer, props.why)
    result.value = await chatAI(cfg, messages)
  } catch (e) {
    error.value = '调用失败：' + (e.message || e)
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!result.value || !inBrowser) return
  try { await navigator.clipboard.writeText(result.value); alert('已复制') } catch { /* ignore */ }
}

function toggleSettings() {
  showSettings.value = !showSettings.value
  error.value = ''
}
</script>

<template>
  <div class="ai-explain">
    <div class="ai-toolbar">
      <button class="ai-btn" :disabled="loading" @click="generate">
        {{ loading ? '生成中…' : '🤖 AI 讲解' }}
      </button>
      <button class="ai-ghost" @click="toggleSettings">{{ showSettings ? '收起配置' : 'AI 配置(BYO Key)' }}</button>
    </div>

    <div v-if="showSettings" class="ai-settings">
      <label>API Base URL
        <input v-model="cfg.baseUrl" placeholder="https://api.deepseek.com" />
      </label>
      <label>模型
        <input v-model="cfg.model" placeholder="deepseek-chat" />
      </label>
      <label>API Key（仅存本地，只发给上述地址）
        <input v-model="cfg.key" type="password" placeholder="sk-..." />
      </label>
      <div class="ai-settings-actions">
        <button class="ai-btn small" @click="save">保存</button>
        <span v-if="!configured()" class="ai-tip">请先配置 API Key</span>
      </div>
      <p class="ai-note">采用「以标准答案为 ground truth」的方式（判题=事实 / AI=教练），若结果与答案矛盾说明配置或模型异常。密钥不会上传到本站任何服务器。</p>
    </div>

    <div v-if="error" class="ai-error">{{ error }}</div>

    <div v-if="result" class="ai-result">
      <div class="ai-result-head">
        <span>💬 AI 讲解</span>
        <button class="ai-ghost" @click="copyResult">复制</button>
      </div>
      <pre class="ai-body">{{ result }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ai-explain { margin-top: 14px; border-top: 1px dashed var(--vp-c-divider); padding-top: 12px; }
.ai-toolbar { display: flex; align-items: center; gap: 12px; }
.ai-btn { border: none; cursor: pointer; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #fff; background: linear-gradient(135deg, #6d5dfc, #4c81c4); }
.ai-btn:disabled { opacity: .6; cursor: not-allowed; }
.ai-btn.small { padding: 6px 12px; font-size: 13px; }
.ai-ghost { background: none; border: none; cursor: pointer; color: var(--vp-c-brand-1); font-size: 13px; }
.ai-settings { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 12px 14px; }
.ai-settings label { font-size: 13px; color: var(--vp-c-text-2); display: flex; flex-direction: column; gap: 4px; }
.ai-settings input { padding: 6px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px; font-size: 13px; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); }
.ai-settings-actions { display: flex; align-items: center; gap: 10px; }
.ai-tip { font-size: 12px; color: var(--vp-c-warning-1); }
.ai-note { font-size: 12px; color: var(--vp-c-text-3); margin: 4px 0 0; }
.ai-error { margin-top: 10px; font-size: 13px; color: var(--vp-c-danger-1); background: var(--vp-c-danger-soft); padding: 8px 10px; border-radius: 8px; }
.ai-result { margin-top: 12px; border: 1px solid var(--vp-c-divider); border-radius: 10px; background: var(--vp-c-bg-soft); padding: 12px 14px; }
.ai-result-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 8px; }
.ai-body { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.75; color: var(--vp-c-text-1); margin: 0; }
</style>
