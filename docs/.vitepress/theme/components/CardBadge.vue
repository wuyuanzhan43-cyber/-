<script setup>
import { computed } from 'vue'

const props = defineProps({
  difficulty: { type: [Number, String], default: 2 },
  tags: { type: Array, default: () => [] },
  company: { type: Array, default: () => [] },
})

const LEVEL = {
  1: { label: '入门', color: '#67c23a' },
  2: { label: '基础', color: '#409eff' },
  3: { label: '进阶', color: '#e6a23c' },
  4: { label: '困难', color: '#f56c6c' },
  5: { label: '专家', color: '#9b59b6' },
}

const d = computed(() => {
  const n = Number(props.difficulty)
  return LEVEL[n] || LEVEL[2]
})

const stars = computed(() => '★'.repeat(Number(props.difficulty) || 2))
</script>

<template>
  <div class="cardbadge">
    <span class="badge diff" :style="{ color: d.color, borderColor: d.color }">
      <span class="stars">{{ stars }}</span> {{ d.label }}
    </span>
    <span v-for="t in tags" :key="t" class="badge tag">#{{ t }}</span>
    <span v-for="c in company" :key="c" class="badge co">🏢 {{ c }}</span>
  </div>
</template>

<style scoped>
.cardbadge { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.badge {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px 8px; border-radius: 999px; font-size: 12px;
  border: 1px solid var(--vp-c-divider); color: var(--vp-c-text-2);
}
.badge.stars { letter-spacing: -1px; }
.badge.diff { font-weight: 600; }
.badge.tag { background: var(--vp-c-bg-alt); }
.badge.co { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
</style>
