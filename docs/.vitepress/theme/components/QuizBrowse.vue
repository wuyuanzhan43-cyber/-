<script setup>
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import { inBrowser, withBase } from 'vitepress'
import { initProgress, getCardState, schedule } from '../storage'
import { renderMd } from '../md'

const deck = inject('deck', [])

const CAT_LABEL = {
  c: 'C/C++', ds: '数据结构', os: 'OS/RTOS', linux: 'Linux',
  arm: 'ARM', bus: '总线', mcu: 'MCU', toolchain: '工具链', method: '方法论',
}

// 按分类分组
const groups = computed(() => {
  const g = {}
  for (const c of deck) {
    const cat = c.category || 'other'
    ;(g[cat] = g[cat] || []).push(c)
  }
  return g
})
const cats = computed(() => Object.keys(groups.value))

const revealed = reactive({}) // id -> bool
function toggle(id) { revealed[id] = !revealed[id] }
function expandAll() { for (const c of deck) revealed[c.id] = true }
function collapseAll() { for (const c of deck) revealed[c.id] = false }

function refresh() {
  if (!inBrowser) return
  window.dispatchEvent(new CustomEvent('deck-updated'))
}

function rate(id, r) {
  if (!inBrowser) return
  schedule(id, r)
  refresh()
}

// 状态文本
function statusOf(id) {
  if (!inBrowser) return ''
  const s = getCardState(id)
  if (!s) return ''
  if (s.wrong) return '🔴'
  if (s.box >= 4) return '🟢'
  if (s.box >= 2) return '🟡'
  return ''
}

// scrollspy：当前高亮
const activeId = ref('')
const items = ref([])
let observer = null

function onScrollSpy() {
  // 由 IntersectionObserver 回调调用
}
function setActive(id) { activeId.value = id }

function scrollTo(qid) {
  activeId.value = qid
  const el = document.getElementById('qb-' + qid)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  if (!inBrowser) return
  initProgress()
  items.value = deck.map((c) => c.id)
  observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.getAttribute('id')?.replace('qb-', '')
        if (id) activeId.value = id
      }
    })
  }, { rootMargin: '-5% 0px -80% 0px' })
  // 延迟到 DOM 渲染后再 observe
  requestAnimationFrame(() => {
    items.value.forEach((id) => {
      const el = document.getElementById('qb-' + id)
      if (el) observer.observe(el)
    })
  })
})
onUnmounted(() => { if (observer) observer.disconnect() })
</script>

<template>
  <div class="qb">
    <aside class="qb-nav">
      <div class="qb-nav-head">
        <div class="qb-nav-actions">
          <button class="mini" @click="expandAll">展开全部</button>
          <button class="mini" @click="collapseAll">折叠全部</button>
        </div>
        <div class="qb-nav-count">共 {{ deck.length }} 题</div>
      </div>
      <ul class="qb-nav-list">
        <li v-for="cat in cats" :key="cat" class="qb-nav-cat">
          <div class="qb-nav-cat-title">{{ CAT_LABEL[cat] || cat }}</div>
          <ul>
            <li v-for="c in groups[cat]" :key="c.id">
              <a
                class="qb-nav-item" :class="{ active: activeId === c.id }"
                :href="'#' + 'qb-' + c.id" @click.prevent="scrollTo(c.id)"
              ><span class="dot" :class="{ ok: statusOf(c.id) }">{{ statusOf(c.id) }}</span>{{ c.title }}</a>
            </li>
          </ul>
        </li>
      </ul>
    </aside>

    <section class="qb-main">
      <div v-for="cat in cats" :key="cat" class="qb-cat">
        <h3 class="qb-cat-title">{{ CAT_LABEL[cat] || cat }} · {{ groups[cat].length }} 题</h3>
        <div v-for="c in groups[cat]" :key="c.id" :id="'qb-' + c.id" class="qb-item">
          <div class="qb-item-head">
            <span class="qb-title">{{ c.title }}</span>
            <span class="qb-diff">{{ '★'.repeat(c.difficulty || 2) }}</span>
          </div>
          <template v-if="!revealed[c.id]">
            <button class="mini qb-reveal" @click="toggle(c.id)">查看答案</button>
          </template>
          <template v-else>
            <div class="qb-body">
              <div class="qb-label">✅ 答案</div>
              <div class="qb-text" v-html="renderMd(c.answer)"></div>
              <div v-if="c.why" class="qb-label" style="margin-top:8px">💡 为什么</div>
              <div v-if="c.why" class="qb-text" v-html="renderMd(c.why)"></div>
            </div>
            <div class="qb-rate">
              <button class="mini again" @click="rate(c.id, 'again')">🔴 生</button>
              <button class="mini good" @click="rate(c.id, 'good')">🟢 熟</button>
              <a class="mini link" :href="withBase(c.route)">📖 阅读页</a>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.qb { display: flex; gap: 20px; align-items: flex-start; }
.qb-nav {
  width: 240px; flex: none; position: sticky; top: 80px; max-height: calc(100vh - 100px);
  overflow-y: auto; padding: 12px; border: 1px solid var(--vp-c-divider); border-radius: 12px;
  background: var(--vp-c-bg-soft);
}
.qb-nav-head { margin-bottom: 8px; }
.qb-nav-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.qb-nav-count { font-size: 12px; color: var(--vp-c-text-3); margin-top: 6px; }
.qb-nav-list { list-style: none; padding: 0; margin: 0; }
.qb-nav-cat-title { font-weight: 700; color: var(--vp-c-text-1); margin: 10px 0 4px; font-size: 13px; }
.qb-nav-list ul { list-style: none; padding: 0; margin: 0; }
.qb-nav-item {
  display: flex; align-items: center; gap: 4px; padding: 4px 6px; font-size: 12px;
  color: var(--vp-c-text-2); text-decoration: none; border-radius: 6px; line-height: 1.4;
}
.qb-nav-item:hover { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.qb-nav-item.active { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 600; }
.qb-nav-item .dot { flex: none; font-size: 11px; }

.qb-main { flex: 1; min-width: 0; }
.qb-cat-title { margin: 18px 0 8px; font-size: 16px; }
.qb-item {
  border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 12px 14px;
  margin-bottom: 10px; background: var(--vp-c-bg-soft);
}
.qb-item-head { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 8px; }
.qb-title { font-weight: 600; font-size: 14px; }
.qb-diff { color: var(--vp-c-brand-1); font-size: 12px; letter-spacing: -1px; flex: none; }
.qb-reveal { background: var(--vp-c-brand); color: #fff; }
.qb-label { font-size: 11px; color: var(--vp-c-text-3); margin-bottom: 3px; }
.qb-text { font-size: 14px; line-height: 1.7; }
.qb-body { margin: 8px 0; }
.qb-rate { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.mini { border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; color: var(--vp-c-text-2); }
.mini.again { border-color: #f56c6c; color: #f56c6c; }
.mini.good { border-color: #67c23a; color: #67c23a; }
.mini.link { color: var(--vp-c-brand-1); text-decoration: none; display: inline-flex; align-items: center; }

@media (max-width: 860px) {
  .qb { flex-direction: column; }
  .qb-nav { width: 100%; position: static; max-height: none; }
}
</style>
