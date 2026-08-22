// 题库装载器：把 docs 下所有 q-*.md 的 front-matter 抽取成结构化题目元数据。
// 题卡的「阅读页」由 VitePress 渲染；「自测刷题 / 进度 / 错题本」则由这里的 deck 驱动。
// 这样单一内容源（Markdown + front-matter）同时支撑阅读与交互两层。

// Vite 的 import.meta.glob：构建期把匹配到的 .md 文件以原始字符串形式引入。
// ?raw 返回文件原始文本（含 front-matter），我们手动解析，避免与 VitePress 编译冲突。
const modules = import.meta.glob('../../**/q-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// 从原始 markdown 文本中抽取 --- 包裹的 YAML front-matter，返回 { data, body, raw }
export function parseMarkdown(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw, raw }
  const yaml = m[1]
  const body = m[2] || ''
  const data = parseYamlLite(yaml)
  return { data, body, raw }
}

// 轻量 YAML 解析：只支持本手册 front-matter 用到的键（标量/数组/缩进块）。
// 刻意不引入 yaml 依赖，保持零依赖、可静态化。
function parseYamlLite(text) {
  const out = {}
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) { i++; continue }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!kv) { i++; continue }
    const key = kv[1]
    let val = kv[2].trim()
    // 数组：[...] 或 每行 - item
    if (val.startsWith('[')) {
      out[key] = parseArrayInline(val)
      i++
    } else if (val.startsWith('|') || val.startsWith('>')) {
      // 块标量（多行文本）
      const chomp = val[0]
      i++
      const collected = []
      let indent = -1
      while (i < lines.length) {
        const l = lines[i]
        if (/^\S/.test(l) && indent === -1 && l.length > 0) break
        if (/^\s*$/.test(l)) { collected.push(''); i++; continue }
        const curIndent = l.match(/^(\s*)/)[1].length
        if (indent === -1) indent = curIndent
        else if (curIndent < indent) break
        collected.push(l.slice(indent))
        i++
      }
      out[key] = chomp === '|' ? collected.join('\n').replace(/\n+$/, '') : collected.join(' ').replace(/\s+$/, '')
    } else if (val === '') {
      // 可能是缩进数组或为空
      i++
      // 判断下一行是否是 - 开头的数组项
      let arr = []
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        arr.push(lines[i].replace(/^\s+-\s+/, '').trim())
        i++
      }
      out[key] = arr.length ? arr : ''
    } else {
      out[key] = parseScalar(val)
      i++
    }
  }
  return out
}

function parseScalar(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^\d+$/.test(v)) return Number(v)
  // 去掉引号
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

function parseArrayInline(val) {
  const body = val.slice(1, -1)
  if (!body.trim()) return []
  return body.split(',').map((s) => parseScalar(s.trim())).filter((x) => x !== '' && x != null)
}

// 从 glob key（如 /docs/guide/c/q-volatile.md）推导站内路由（cleanUrls）
function deriveRoute(key) {
  const m = key.match(/(\/guide\/[\w/-]+)\.md$/)
  if (m) return m[1]
  // 兜底：去掉前缀与 .md
  return key.replace(/^.*?(\/guide\/)/, '$1').replace(/\.md$/, '')
}

// 统一构建题库：返回题目对象数组
export function loadDeck() {
  const deck = []
  for (const [key, raw] of Object.entries(modules)) {
    const { data } = parseMarkdown(raw)
    if (!data.title && !data.answer) continue
    deck.push({
      id: data.id || deriveId(key),
      route: deriveRoute(key),
      title: data.title || '',
      category: data.category || '',
      difficulty: data.difficulty != null ? data.difficulty : 2,
      tags: Array.isArray(data.tags) ? data.tags : [],
      company: Array.isArray(data.company) ? data.company : [],
      answer: data.answer || '',
      why: data.why || '',
      keywords: data.keywords || '',
    })
  }
  // 按 分类 -> 难度 排序，保证稳定顺序
  return deck
}

function deriveId(key) {
  const m = key.match(/q-([\w-]+)\.md$/)
  return m ? m[1] : key
}
