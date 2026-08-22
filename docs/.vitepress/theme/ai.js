// AI 讲解模块 —— BYO key（用户自填 API Key，仅存本地浏览器）。
// 设计遵循调研得出的「判题=事实 / AI=教练」：提示词把标准答案作为 ground truth，
// 要求 AI 严格基于标准答案讲解，不编造、不给与答案矛盾的结论，从而抑制幻觉。
// 纯客户端调用（OpenAI 兼容 /chat/completions），key 只发给用户填写的 provider。

const AI_KEY = 'embedded-handbook:ai'

export const DEFAULT_AI = {
  baseUrl: 'https://api.deepseek.com', // OpenAI 兼容的 base URL（DeepSeek 默认）
  model: 'deepseek-chat',
  key: '',
}

export function getAIConfig() {
  try {
    const r = JSON.parse(localStorage.getItem(AI_KEY))
    return { ...DEFAULT_AI, ...(r && typeof r === 'object' ? r : {}) }
  } catch {
    return { ...DEFAULT_AI }
  }
}

export function setAIConfig(cfg) {
  localStorage.setItem(AI_KEY, JSON.stringify({ ...DEFAULT_AI, ...cfg }))
}

export function hasAIKey() {
  return !!(getAIConfig().key || '').trim()
}

// 调用 OpenAI 兼容接口：{ baseUrl, model, key } + messages -> 返回 assistant 文本
export async function chatAI(cfg, messages) {
  const base = (cfg.baseUrl || '').trim().replace(/\/+$/, '')
  const url = base + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + (cfg.key || '').trim(),
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_AI.model,
      messages,
      temperature: 0.3,
      stream: false,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error('HTTP ' + res.status + (t ? ' – ' + t.slice(0, 200) : ''))
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || '（无返回内容）'
}

// 组装「锚定标准答案」的提示词
export function buildMessages(title, answer, why) {
  return [
    {
      role: 'system',
      content:
        '你是一位嵌入式软件工程师面试教练。下面给出某道面试题的题目、标准答案（ground truth）与原因。' +
        '要求：严格基于标准答案进行讲解，不得编造、不得给出与标准答案相矛盾的结论；用中文。' +
        '先给 1 段清晰结论，再分 3 点展开讲解，最后提 2 个可能的面试追问方向。',
    },
    {
      role: 'user',
      content:
        `题目：${title}\n\n` +
        `标准答案（ground truth）：${answer}\n\n` +
        `为什么/讲解要点：${why || '（无）'}\n\n` +
        '请以此为据讲解，并指出 2 个进阶追问方向。',
    },
  ]
}
