<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useData, inBrowser } from 'vitepress'
import CardBadge from './CardBadge.vue'
import { getCardState, schedule, getStats } from '../storage'

const { page } = useData()

// 从当前页 front-matter 读取题卡数据
const fm = computed(() => page.value.frontmatter || {})
const id = computed(() => fm.value.id || '')
const title = computed(() => fm.value.title || '')
const answer = computed(() => fm.value.answer || '')
const why = computed(() => fm.value.why || '')
const difficulty = computed(() => fm.value.difficulty || 2)
const tags = computed(() => (Array.isArray(fm.value.tags) ? fm.value.tags : []))
const company = computed(() => (Array.isArray(fm.value.company) ? fm.value.company : []))

const revealed = ref(false)
const cardState = ref(null)

function refresh() {
  if (!inBrowser || !id.value) return
  cardState.value = getCardState(id.value)
}

onMounted(refresh)
watch(id, refresh)

function rate(rating) {
  if (!id.value) return
  schedule(id.value, rating)
  revealed.value = false
  refresh()
  window.dispatchEvent(new CustomEvent('deck-updated'))
}

const statusText = computed(() => {
  if (!cardState.value) return ''
  const c = cardState.value
  if (c.wrong) return '🔴 错题（需重点复习）'
  if (c.box >= 4) return '🟢 已掌握'
  if (c.box >= 2) return '🟡 复习中'
  return ''
})
</script>

<template>
  <section class="flash-card">
    <div class="fc-head">
      <CardBadge :difficulty="difficulty" :tags="tags" :company="company" />
      <span class="status">{{ statusText }}</span>
    </div>

    <div class="fc-question">
      <div class="fc-label">题目</div>
      <div class="fc-title">{{ title }}</div>
    </div>

    <template v-if="!revealed">
      <button class="btn reveal" @click="revealed = true">👀 显示标准答案与为什么</button>
    </template>
    <template v-else>
      <div class="fc-answer">
        <div class="fc-label">✅ 标准答案</div>
        <div class="fc-body">{{ answer }}</div>
      </div>
      <div v-if="why" class="fc-why">
        <div class="fc-label">💡 为什么（讲解）</div>
        <div class="fc-body">{{ why }}</div>
      </div>
      <div class="fc-rate">
        <span class="fs-14">自测打分：</span>
        <button class="btn again" @click="rate('again')">🔴 生（没记住）</button>
        <button class="btn good" @click="rate('good')">🟢 熟（记住了）</button>
      </div>
    </template>

    <div class="fc-hint">答案与讲解记录到本地进度，支撑「记忆曲线 / 错题本」。</div>

    <AIExplain :title="title" :answer="answer" :why="why" />
  </section>
</template>

<style scoped>
.flash-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 18px 20px;
  background: var(--vp-c-bg-soft);
  margin: 16px 0;
}
.fc-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.status { font-size: 13px; color: var(--vp-c-text-2); }
.fc-label { font-size: 12px; color: var(--vp-c-text-3); margin-bottom: 4px; letter-spacing: 0.5px; }
.fc-title { font-size: 17px; font-weight: 700; line-height: 1.5; }
.fc-question { margin-bottom: 12px; }
.fc-answer, .fc-why { margin: 10px 0; }
.fc-body { font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
.fc-rate { display: flex; align-items: center; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.fs-14 { font-size: 14px; color: var(--vp-c-text-2); }
.btn {
  border: none; cursor: pointer; padding: 8px 16px; border-radius: 8px;
  font-size: 14px; font-weight: 600; color: #fff; transition: opacity .15s;
}
.btn:hover { opacity: .88; }
.btn.reveal { background: var(--vp-c-brand); }
.btn.again { background: #f56c6c; }
.btn.good { background: #67c23a; }
.fc-hint { margin-top: 12px; font-size: 12px; color: var(--vp-c-text-3); }
</style>
