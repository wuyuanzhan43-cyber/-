<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { inBrowser } from 'vitepress'
import { initProgress, getCardState, schedule } from '../storage'
import { renderMd } from '../md'

const deck = inject('deck', [])

// 一次性全屏刷题：队列、当前索引、是否显示答案
const queue = ref([])
const idx = ref(0)
const revealed = ref(false)
const shuffle = ref(false)

function shuffleArray(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function resetQueue() {
  let ids = deck.map((c) => c.id)
  if (shuffle.value) ids = shuffleArray(ids)
  queue.value = ids
  idx.value = 0
  revealed.value = false
}

const current = computed(() => deck.find((c) => c.id === queue.value[idx.value]) || null)
const progress = computed(() => (queue.value.length ? `${idx.value + 1} / ${queue.value.length}` : '0 / 0'))

function toggleReveal() { revealed.value = !revealed.value }
function next() { if (idx.value < queue.value.length - 1) { idx.value++; revealed.value = false } }
function prev() { if (idx.value > 0) { idx.value--; revealed.value = false } }
function rate(r) {
  if (!current.value) return
  schedule(current.value.id, r)
  // 记录后自动下一题（若还有）
  if (idx.value < queue.value.length - 1) { idx.value++; revealed.value = false }
  else revealed.value = false
}

function onKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') next()
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') prev()
  else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); toggleReveal() }
}

function closeSelf() {
  window.dispatchEvent(new CustomEvent('fullquiz-close'))
}

onMounted(() => {
  if (!inBrowser) return
  initProgress()
  resetQueue()
  window.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="fq">
    <div class="fq-top">
      <span class="fq-progress">{{ progress }}</span>
      <div class="fq-topbtns">
        <button class="fq-btn" @click="shuffle = !shuffle; resetQueue(); revealed = false">{{ shuffle ? '🔀 乱序开' : '顺序' }}</button>
        <button class="fq-btn" @click="closeSelf">✕ 退出全屏</button>
      </div>
    </div>

    <template v-if="current">
      <div class="fq-badge">{{ current.category }} · {{ '★'.repeat(current.difficulty || 2) }}</div>

      <div class="fq-question" @click="toggleReveal">
        <div class="fq-q-label">题 {{ idx.value + 1 }}</div>
        <div class="fq-q-text">{{ current.title }}</div>
      </div>

      <div v-if="!revealed" class="fq-reveal" @click="toggleReveal">👇 点一下 / 按空格 看答案</div>

      <div v-else class="fq-answer">
        <div class="fq-ans-scroll">
          <div class="fq-a-label">✅ 答案</div>
          <div class="fq-a-body" v-html="renderMd(current.answer)"></div>
          <div v-if="current.why" class="fq-a-label" style="margin-top:10px">💡 为什么</div>
          <div v-if="current.why" class="fq-a-body" v-html="renderMd(current.why)"></div>
        </div>
        <div class="fq-rate">
          <button class="fq-r again" @click="rate('again')">🔴 生（没记住）</button>
          <button class="fq-r good" @click="rate('good')">🟢 熟（记住了）</button>
        </div>
      </div>
    </template>
    <div v-else class="fq-empty">本轮结束</div>

    <div class="fq-bottom">
      <button class="fq-btn" @click="prev" :disabled="idx === 0">← 上一题</button>
      <button class="fq-btn" @click="toggleReveal">{{ revealed ? '收起答案' : '显示答案' }}</button>
      <button class="fq-btn" @click="next" :disabled="idx >= queue.length - 1">下一题 →</button>
    </div>

    <p class="fq-keys">←/→ 切题 · 空格/Enter 翻答案 · Esc 退出全屏</p>
  </div>
</template>

<style scoped>
.fq {
  position: fixed; inset: 0; z-index: 5000; display: flex; flex-direction: column;
  background: linear-gradient(160deg, #1e2633 0%, #141a24 100%); color: #e8eaf0; padding: 20px 28px;
  font-family: -apple-system, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif;
}
.fq-top { display: flex; justify-content: space-between; align-items: center; flex: none; }
.fq-progress { font-size: 14px; color: #9aa7bd; font-weight: 600; }
.fq-topbtns { display: flex; gap: 8px; }
.fq-btn {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #e8eaf0;
  padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all .15s;
}
.fq-btn:hover { background: rgba(255,255,255,0.16); }
.fq-btn:disabled { opacity: .4; cursor: not-allowed; }
.fq-badge { text-align: center; color: #7fd3ff; font-size: 13px; margin-top: 6px; flex: none; }
.fq-question {
  flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center; padding: 12px 8%; cursor: pointer; min-height: 0;
}
.fq-q-label { color: #7fd3ff; font-size: 13px; margin-bottom: 12px; }
.fq-q-text { font-size: clamp(20px, 3.2vw, 34px); font-weight: 700; line-height: 1.55; color: #fff; }
.fq-reveal { flex: none; text-align: center; color: #9aa7bd; font-size: 16px; padding: 18px 0 6px; cursor: pointer; animation: pulse 1.6s infinite; }
@keyframes pulse { 0%,100%{opacity:.55} 50%{opacity:1} }

.fq-answer { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.fq-ans-scroll { flex: 1; overflow-y: auto; padding: 4px 2px 8px; }
.fq-a-label { color: #9aa7bd; font-size: 12px; margin-bottom: 4px; }
.fq-a-body { font-size: 16px; line-height: 1.8; color: #e8eaf0; }
.fq-a-body :deep(p) { margin: 0 0 8px; }
.fq-a-body :deep(ul), .fq-a-body :deep(ol) { margin: 8px 0; padding-left: 1.4em; }
.fq-a-body :deep(li) { margin: 3px 0; }
.fq-a-body :deep(strong) { color: #fff; }
.fq-a-body :deep(code) { background: rgba(255,255,255,0.12); color: #7fd3ff; padding: 1px 6px; border-radius: 4px; }
.fq-a-body :deep(pre) { background: #0d1117; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 12px 14px; overflow-x: auto; }
.fq-a-body :deep(blockquote) { border-left: 3px solid #7fd3ff; background: rgba(127,211,255,0.08); padding: 6px 12px; margin: 8px 0; }
.fq-rate { flex: none; display: flex; gap: 10px; justify-content: center; padding-top: 8px; }
.fq-r { padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; color: #fff; }
.fq-r.again { background: #f56c6c; }
.fq-r.good { background: #67c23a; }

.fq-bottom { flex: none; display: flex; justify-content: center; gap: 10px; padding-top: 12px; }
.fq-keys { flex: none; text-align: center; color: #6b7891; font-size: 12px; margin-top: 10px; }
</style>
