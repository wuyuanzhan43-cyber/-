// 校勘脚本：检查所有题卡 q-*.md 是否具备必需的 front-matter 字段。
// 用法：pnpm proofread
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// scripts/proofread.mjs 的父目录 = 项目根，再拼 docs
const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(SCRIPT_DIR, '..')
const DOCS = join(ROOT, 'docs')

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (e.startsWith('q-') && e.endsWith('.md')) out.push(p)
  }
  return out
}

const REQUIRED = ['id', 'title', 'category', 'difficulty', 'answer', 'why']

function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return null
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (kv) data[kv[1]] = kv[2].trim()
  }
  return data
}

const files = walk(DOCS)
let ok = 0, bad = 0
const problems = []
for (const f of files) {
  const fm = parseFm(readFileSync(f, 'utf8'))
  if (!fm) { problems.push(`${f}: 无法解析 front-matter`); bad++; continue }
  const missing = REQUIRED.filter((k) => !fm[k])
  if (missing.length) {
    problems.push(`${f}: 缺少字段 [${missing.join(', ')}]`)
    bad++
  } else {
    ok++
  }
}

console.log(`共 ${files.length} 道题卡：通过 ${ok}，问题 ${bad}`)
if (problems.length) {
  console.log('\n问题清单：')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
