// 轻量 Markdown 渲染：仅用于题卡的「标准答案」与「为什么」字段。
// 这些字段在 front-matter 里含 Markdown（如 **加粗**、- 列表、`代码`），
// 需要渲染成真正的 HTML（加粗/列表/行内代码），而不是当作纯文本显示。
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,     // 关闭原始 HTML，避免 XSS（内容为我们自著）
  linkify: true,
  breaks: true,    // 单换行转 <br>/<p>，保持 front-matter 的行结构
})

// 返回 HTML 字符串，供 v-html 使用
export function renderMd(text) {
  return md.render(text || '')
}
