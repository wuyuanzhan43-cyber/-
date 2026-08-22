import DefaultTheme from 'vitepress/theme'
import { inBrowser } from 'vitepress'
import './custom.css'

import Layout from './Layout.vue'
import FlashCard from './components/FlashCard.vue'
import CardBadge from './components/CardBadge.vue'
import AIExplain from './components/AIExplain.vue'

// 题卡元数据解析工具（从 markdown 原始文本抽取 front-matter）
import { loadDeck } from './deck'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // 注册全局组件：题卡正文里直接用 <FlashCard />
    app.component('FlashCard', FlashCard)
    app.component('CardBadge', CardBadge)
    app.component('AIExplain', AIExplain)
    // 提供一个全局的题库（含题卡元数据），供自测与进度系统使用
    if (inBrowser) {
      app.provide('deck', loadDeck())
    }
  },
}
