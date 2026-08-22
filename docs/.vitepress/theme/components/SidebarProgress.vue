<script setup>
import { inject, ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { inBrowser } from 'vitepress'
import { initProgress, getCardState } from '../storage'

const deck = inject('deck', [])

const CAT_LABEL = {
  c: 'C/C++', ds: '数据结构', os: 'OS/RTOS', linux: 'Linux',
  arm: 'ARM', bus: '总线', mcu: 'MCU', toolchain: '工具链', method: '方法论',
}

const state = reactive({ byCat: {} })

function refresh() {
  if (!inBrowser) return
  initProgress()
  const byCat = {}
  for (const cat of Object.keys(CAT_LABEL)) byCat[cat] = { total: 0, mastered: 0, reviewing: 0, done: 0 }
  for (const c of deck) {
    const cat = byCat[c.category]
    if (!cat) continue
    cat.total++
    const s = getCardState(c.id)
    if (s && s.wrong) { cat.reviewing++ ; cat.done++ }
    else if (s && s.box >= 4) { cat.mastered++ ; cat.done++ }
    else if (s && s.box >= 2) { cat.reviewing++ ; cat.done++ }
  }
  state.byCat = byCat
}

const overall = computed(() => {
  const t = inBrowser ? deck.length : 0
  let done = 0
  for (const k in state.byCat) done += state.byCat[k].done
  return { total: t, done }
})

function onUpdated() { refresh() }
function onVisible() { refresh() }

onMounted(() => {
  refresh()
  window.addEventListener('deck-updated', onUpdated)
  window.addEventListener('focus', onVisible)
})
onUnmounted(() => {
  window.removeEventListener('deck-updated', onUpdated)
  window.removeEventListener('focus', onVisible)
})

function pct(done, total) {
  return total ? Math.round((done / total) * 100) : 0
}
</script>

<template>
  <div v-if="inBrowser && deck.length" class="side-progress">
    <div class="sp-head">
      <span>学习进度</span>
      <b>{{ overall.done }}/{{ overall.total }}</b>
    </div>
    <div class="sp-bar">
      <div class="sp-fill" :style="{ width: pct(overall.done, overall.total) + '%' }"></div>
    </div>
    <ul class="sp-list">
      <li v-for="(cat, key) in state.byCat" :key="key" v-if="cat.total" class="sp-item">
        <span class="sp-dot" :class="{ m: cat.mastered, r: cat.reviewing }"></span>
        <span class="sp-name">{{ CAT_LABEL[key] }}</span>
        <span class="sp-cnt">{{ cat.done }}/{{ cat.total }}</span>
      </li>
    </ul>
    <p class="sp-tip">侧边栏点亮的项 = 已学习的题；点「阅读页」可继续。</p>
  </div>
</template>

<style scoped>
.side-progress {
  margin: 0 12px 12px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}
.sp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-weight: 600; color: var(--vp-c-text-1); }
.sp-bar { height: 8px; background: var(--vp-c-bg); border-radius: 999px; overflow: hidden; border: 1px solid var(--vp-c-divider); }
.sp-fill { height: 100%; background: var(--vp-c-brand); border-radius: 999px; transition: width .3s; }
.sp-list { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 4px; }
.sp-item { display: flex; align-items: center; gap: 6px; }
.sp-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); flex: none; }
.sp-dot.m { background: #67c23a; border-color: #67c23a; }
.sp-dot.r { background: #e6a23c; border-color: #e6a23c; }
.sp-name { flex: 1; color: var(--vp-c-text-2); }
.sp-cnt { color: var(--vp-c-text-3); font-size: 12px; }
.sp-tip { font-size: 12px; color: var(--vp-c-text-3); margin: 8px 0 0; }
</style>
