<script setup>
import { ref, computed, inject, onMounted, reactive } from 'vue'
import { inBrowser, withBase } from 'vitepress'
import {
  initProgress, getCardState, schedule, getDueIds, getWrongIds, getStats, resetAll,
} from '../storage'
import { renderMd } from '../md'

const deck = inject('deck', [])
const byId = computed(() => Object.fromEntries(deck.map((c) => [c.id, c])))

const tabs = [
  { key: 'quiz', label: '自测' },
  { key: 'progress', label: '进度概览' },
  { key: 'wrong', label: '错题本' },
]
const active = ref('quiz')

// ------- 自测队列 -------
const mode = ref('due') // 'due' 复习到期 | 'all' 全部
const queue = ref([])
const idx = ref(0)
const revealed = ref(false)
const sessionDone = ref(false)

function buildQueue(m) {
  if (!inBrowser) return
  initProgress()
  let ids
  if (m === 'due') {
    ids = getDueIds()
    if (ids.length === 0) {
      // 没有到期：优先未录入的，其次全部
      const unseen = deck.filter((c) => !getCardState(c.id)).map((c) => c.id)
      ids = unseen.length ? unseen : deck.map((c) => c.id)
    }
  } else {
    ids = deck.map((c) => c.id)
  }
  queue.value = ids
  idx.value = 0
  revealed.value = false
  sessionDone.value = ids.length === 0
}

const current = computed(() => byId.value[queue.value[idx.value]] || null)
const progressText = computed(() => `${Math.min(idx.value + 1, queue.value.length)} / ${queue.value.length}`)

function reveal() { revealed.value = true }

function rate(r) {
  if (!current.value) return
  schedule(current.value.id, r)
  revealed.value = false
  if (idx.value < queue.value.length - 1) {
    idx.value += 1
  } else {
    sessionDone.value = true
  }
  window.dispatchEvent(new CustomEvent('deck-updated'))
}

function startQuiz() { active.value = 'quiz'; buildQueue(mode.value) }
function switchMode(m) { mode.value = m; buildQueue(m) }

// ------- 统计 -------
const stats = reactive({ total: 0, reviewed: 0, due: 0, mastered: 0, wrong: 0 })
function refreshStats() {
  if (!inBrowser) return
  Object.assign(stats, getStats(deck.length))
}
onMounted(() => {
  initProgress()
  buildQueue('due')
  refreshStats()
  window.addEventListener('deck-updated', refreshStats)
})

// 记忆盒子分布
const boxDist = computed(() => {
  const d = [0, 0, 0, 0, 0, 0] // box 0..5
  for (const c of deck) {
    const s = getCardState(c.id)
    const b = s ? s.box : 0
    d[b] = (d[b] || 0) + 1
  }
  return d
})

const wrongList = computed(() => {
  const ids = inBrowser ? getWrongIds() : []
  return ids.map((i) => byId.value[i]).filter(Boolean)
})

function reset() {
  if (!inBrowser) return
  if (confirm('确认清空全部学习进度吗？')) {
    resetAll()
    refreshStats()
    buildQueue('due')
    window.dispatchEvent(new CustomEvent('deck-updated'))
  }
}
</script>

<template>
  <div class="study">
    <div class="tabs">
      <button
        v-for="t in tabs" :key="t.key"
        class="tab" :class="{ active: active === t.key }"
        @click="active = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- 自测 -->
    <template v-if="active === 'quiz'">
      <div class="quiz-toolbar">
        <button class="mini" :class="{ on: mode === 'due' }" @click="switchMode('due')">复习到期</button>
        <button class="mini" :class="{ on: mode === 'all' }" @click="switchMode('all')">全部自测</button>
        <span class="progress">{{ progressText }}</span>
        <button class="mini ghost" @click="startQuiz">重新开始</button>
      </div>

      <div v-if="sessionDone" class="done">
        <h3>🎉 本轮完成</h3>
        <p>共 {{ queue.length }} 题已复习。到期的题会进入「记忆曲线」，可通过进度概览查看。</p>
        <button class="big" @click="buildQueue(mode)">再测一轮</button>
      </div>

      <div v-else-if="current" class="quiz-card">
        <div class="q-head">
          <span class="q-num">第 {{ idx + 1 }} 题</span>
          <span v-if="current.company && current.company.length" class="co">🏢 {{ current.company.join('、') }}</span>
          <span class="diff">难度 {{ '★'.repeat(current.difficulty) }}</span>
        </div>
        <div class="q-title">{{ current.title }}</div>

        <template v-if="!revealed">
          <button class="big" @click="reveal">👀 显示标准答案与为什么</button>
        </template>
        <template v-else>
          <div class="answer-box">
            <div class="ans-label">✅ 标准答案</div>
            <div class="ans-body" v-html="renderMd(current.answer)"></div>
          </div>
          <div v-if="current.why" class="answer-box why">
            <div class="ans-label">💡 为什么</div>
            <div class="ans-body" v-html="renderMd(current.why)"></div>
          </div>
          <p class="linkline">📖 想看图解 / 深读 → <a :href="withBase(current.route)">阅读页</a></p>
          <div class="rate">
            <button class="big again" @click="rate('again')">🔴 生（没记住）</button>
            <button class="big good" @click="rate('good')">🟢 熟（记住了）</button>
          </div>
          <AIExplain :title="current.title" :answer="current.answer" :why="current.why" />
        </template>
      </div>
    </template>

    <!-- 进度概览 -->
    <template v-else-if="active === 'progress'">
      <div class="stats">
        <div class="stat"><b>{{ stats.total }}</b><span>总题数</span></div>
        <div class="stat"><b>{{ stats.reviewed }}</b><span>已录入进度</span></div>
        <div class="stat"><b>{{ stats.due }}</b><span>待复习</span></div>
        <div class="stat"><b>{{ stats.mastered }}</b><span>已掌握(box≥4)</span></div>
        <div class="stat"><b>{{ stats.wrong }}</b><span>错题</span></div>
      </div>

      <div class="boxdist">
        <h4>记忆盒子分布（SM-2）</h4>
        <div class="bars">
          <div class="bar-row" v-for="(cnt, b) in boxDist.slice(0, 6)" :key="b">
            <span class="bar-label">box{{ b }}</span>
            <div class="bar-track"><div class="bar-fill" :style="{ width: (deck.length ? (cnt / deck.length * 100) : 0) + '%' }"></div></div>
            <span class="bar-cnt">{{ cnt }}</span>
          </div>
        </div>
        <p class="tip">box 越低越需复习：`生`会降到 box1；连续答 `熟` 依次升到 box2~5，间隔 1/3/7/15 天。</p>
      </div>

      <div class="danger">
        <button class="mini ghost" @click="reset">清空进度</button>
      </div>
    </template>

    <!-- 错题本 -->
    <template v-else-if="active === 'wrong'">
      <div class="wrong-note">被标记为「生」的题（box1 / 答错）会进入错题本。</div>
      <ul v-if="wrongList.length" class="wrong-list">
        <li v-for="c in wrongList" :key="c.id">
          <a :href="withBase(c.route)">{{ c.title }}</a>
          <span class="mc">难度 {{ '★'.repeat(c.difficulty) }}</span>
        </li>
      </ul>
      <div v-else class="empty">暂无错题 🎉</div>
    </template>
  </div>
</template>

<style scoped>
.study { max-width: 760px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--vp-c-divider); padding-bottom: 10px; }
.tab { background: none; border: none; cursor: pointer; font-size: 15px; padding: 6px 14px; border-radius: 8px; color: var(--vp-c-text-2); font-weight: 600; }
.tab.active { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.quiz-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.progress { margin-left: auto; font-weight: 700; }
.mini { border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; color: var(--vp-c-text-2); }
.mini.on { border-color: var(--vp-c-brand); color: var(--vp-c-brand-1); }
.mini.ghost { margin-left: auto; }
.big { border: none; cursor: pointer; padding: 10px 18px; border-radius: 10px; font-size: 15px; font-weight: 700; color: #fff; background: var(--vp-c-brand); }
.big:hover { opacity: .9; }
.big.again { background: #f56c6c; }
.big.good { background: #67c23a; }
.quiz-card { border: 1px solid var(--vp-c-divider); border-radius: 14px; padding: 20px; background: var(--vp-c-bg-soft); }
.q-head { display: flex; gap: 12px; font-size: 13px; color: var(--vp-c-text-2); margin-bottom: 12px; flex-wrap: wrap; }
.q-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; line-height: 1.5; }
.answer-box { margin: 12px 0; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 12px 14px; }
.ans-label { font-size: 12px; color: var(--vp-c-text-3); margin-bottom: 4px; }
.ans-body { font-size: 15px; line-height: 1.75; }
.answer-box.why { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-soft); }
.linkline { font-size: 13px; color: var(--vp-c-text-2); }
.rate { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.done { text-align: center; padding: 40px 20px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat { text-align: center; padding: 16px 8px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft); }
.stat b { display: block; font-size: 26px; }
.stat span { font-size: 12px; color: var(--vp-c-text-2); }
.boxdist h4 { margin: 6px 0 10px; }
.bars { display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.bar-label { width: 52px; color: var(--vp-c-text-2); }
.bar-track { flex: 1; height: 14px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--vp-c-brand); border-radius: 999px; }
.bar-cnt { width: 30px; text-align: right; }
.tip { font-size: 13px; color: var(--vp-c-text-2); margin-top: 12px; }
.danger { margin-top: 24px; text-align: right; }
.wrong-note { font-size: 14px; color: var(--vp-c-text-2); margin-bottom: 12px; }
.wrong-list { list-style: none; padding: 0; }
.wrong-list li { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid var(--vp-c-divider); border-radius: 10px; margin-bottom: 8px; background: var(--vp-c-bg-soft); }
.mc { font-size: 12px; color: var(--vp-c-text-3); }
.empty { text-align: center; padding: 40px; color: var(--vp-c-text-3); }
</style>
