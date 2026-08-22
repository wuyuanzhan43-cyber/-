// 进度 / 记忆曲线 / 错题本 —— 全部基于浏览器 localStorage，离线可用、零后端零账号。
// 采用 SM-2 简化版间隔重复：每题一个「记忆盒子」box(1..5) + 下次到期时间 due。
// 每次自测打分：Again(生) -> box=1，Good(熟) -> box 与间隔递增，从而形成复习曲线。

const KEY = 'embedded-handbook:v1'

function read() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY))
    return r && typeof r === 'object' ? r : {}
  } catch {
    return {}
  }
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function initProgress() {
  const s = read()
  if (!s.cards) {
    s.cards = {}
    write(s)
  }
}

// 间隔天数（box -> day），box1 代表「刚错/生」，需立即复习
const INTERVALS = [0, 0, 1, 3, 7, 15]

function now() {
  return Date.now()
}

export function getCardState(id) {
  return read().cards[id] || null
}

// rating: 'again'(生) | 'good'(熟)
export function schedule(id, rating) {
  const s = read()
  if (!s.cards) s.cards = {}
  const c = s.cards[id] || { box: 0, due: 0, reps: 0, last: 0 }
  if (rating === 'again') {
    c.box = 1
    c.due = now() + 5 * 1000 // 5s 后再次出现，加深印象
    c.reps = 0
    c.wrong = true
  } else {
    c.box = Math.min(c.box + 1, 5)
    const days = INTERVALS[c.box]
    c.due = now() + days * 24 * 3600 * 1000
    c.reps = (c.reps || 0) + 1
    c.wrong = false
  }
  c.last = now()
  s.cards[id] = c
  write(s)
  return c
}

// 今天/当前到期的卡片 id 集
export function getDueIds() {
  const s = read()
  if (!s.cards) return []
  const t = now()
  return Object.keys(s.cards).filter((id) => s.cards[id].due <= t)
}

// 错题本：被标记为「生/wrong」的卡片
export function getWrongIds() {
  const s = read()
  if (!s.cards) return []
  return Object.keys(s.cards).filter((id) => s.cards[id].wrong)
}

// 统计：总数 / 已录入 / 到期 / 已掌握 / 错题
export function getStats(total) {
  const s = read()
  const cards = s.cards || {}
  const reviewed = Object.keys(cards).length
  const due = Object.keys(cards).filter((id) => cards[id].due <= now()).length
  const mastered = Object.keys(cards).filter((id) => cards[id].box >= 4).length
  const wrong = Object.keys(cards).filter((id) => cards[id].wrong).length
  return { total, reviewed, due, mastered, wrong }
}

export function resetAll() {
  localStorage.removeItem(KEY)
}
