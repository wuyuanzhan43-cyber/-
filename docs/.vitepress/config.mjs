import { defineConfig } from 'vitepress'

// 站点部署路径（base）。通过环境变量自适应：
// - BASE_PATH 显式指定（如自定义域名/用户主页用 '/', 项目页用 '/<repo>/'）
// - 否则由 REPO_NAME 推断：`xxx.github.io`（用户主页）→ '/', 其他 → '/<repo>/'
// - 本地开发无环境变量 → '/'
function base() {
  const explicit = (process.env.BASE_PATH || '').trim()
  if (explicit) return explicit.endsWith('/') ? explicit : explicit + '/'
  const repo = (process.env.REPO_NAME || '').trim()
  if (!repo) return '/'
  if (/\.github\.io$/i.test(repo)) return '/'
  return `/${repo}/`
}

// 仓库地址，供导航使用；可通过 GITHUB_REPO 覆盖
const repoUrl = (process.env.GITHUB_REPO || 'https://github.com/wuyuanzhan43-cyber/-').trim()
const sidebar = [
  {
    text: '绪论',
    collapsed: false,
    items: [
      { text: '手册说明', link: '/guide/readme' },
    ],
  },
  {
    text: 'C/C++ 语言基础',
    collapsed: false,
    items: [
      { text: 'C 语言概览', link: '/guide/c/' },
      {
        text: '高频题',
        items: [
          { text: 'volatile 的作用', link: '/guide/c/q-volatile' },
          { text: '指针与 const', link: '/guide/c/q-pointer-const' },
          { text: '内存对齐与结构体', link: '/guide/c/q-alignment' },
          { text: 'static 关键字', link: '/guide/c/q-static' },
          { text: '栈与堆、栈溢出', link: '/guide/c/q-stack-heap' },
          { text: '位操作与位域', link: '/guide/c/q-bit-ops' },
        ],
      },
    ],
  },
  {
    text: '数据结构与算法',
    collapsed: false,
    items: [
      { text: '数据结构概览', link: '/guide/ds/' },
      {
        text: '高频题',
        items: [
          { text: '链表 vs 数组', link: '/guide/ds/q-list-array' },
          { text: '环形缓冲区', link: '/guide/ds/q-ring-buffer' },
        ],
      },
    ],
  },
  {
    text: '操作系统与 RTOS',
    collapsed: false,
    items: [
      { text: 'OS 概览', link: '/guide/os/' },
      {
        text: '高频题',
        items: [
          { text: '进程与线程', link: '/guide/os/q-process-thread' },
          { text: '用户态与内核态', link: '/guide/os/q-user-kernel' },
          { text: '死锁', link: '/guide/os/q-deadlock' },
          { text: 'RTOS 优先级反转', link: '/guide/os/q-priority-inversion' },
          { text: '信号量 vs 互斥锁', link: '/guide/os/q-semaphore-mutex' },
          { text: '中断上下文', link: '/guide/os/q-interrupt-context' },
          { text: 'RTOS 任务通信', link: '/guide/os/q-task-comm' },
          { text: '中断嵌套与优先级', link: '/guide/os/q-interrupt-nesting' },
          { text: '看门狗 Watchdog', link: '/guide/os/q-watchdog' },
        ],
      },
    ],
  },
  {
    text: 'Linux 基础',
    collapsed: false,
    items: [
      { text: 'Linux 概览', link: '/guide/linux/' },
      {
        text: '高频题',
        items: [
          { text: '系统启动流程', link: '/guide/linux/q-boot' },
          { text: '字符设备 vs 块设备', link: '/guide/linux/q-char-block' },
          { text: '设备树', link: '/guide/linux/q-devicetree' },
          { text: 'proc 与 sysfs', link: '/guide/linux/q-proc-sysfs' },
          { text: '内存管理 kmalloc/vmalloc', link: '/guide/linux/q-mem-management' },
        ],
      },
    ],
  },
  {
    text: 'ARM 体系与启动',
    collapsed: false,
    items: [
      { text: 'ARM 概览', link: '/guide/arm/' },
      {
        text: '高频题',
        items: [
          { text: '异常向量表与启动', link: '/guide/arm/q-exception-vector' },
          { text: 'MMU 与内存管理', link: '/guide/arm/q-mmu' },
          { text: '大小端', link: '/guide/arm/q-endian' },
        ],
      },
    ],
  },
  {
    text: '总线与通信协议',
    collapsed: false,
    items: [
      { text: '总线概览', link: '/guide/bus/' },
      {
        text: '高频题',
        items: [
          { text: 'I2C vs SPI vs UART', link: '/guide/bus/q-bus' },
          { text: 'DMA 与中断/轮询', link: '/guide/bus/q-dma' },
          { text: 'CAN 总线', link: '/guide/bus/q-can' },
        ],
      },
    ],
  },
  {
    text: '工具链与构建',
    collapsed: false,
    items: [
      { text: '工具链概览', link: '/guide/toolchain/' },
      {
        text: '高频题',
        items: [
          { text: '编译与链接的四个阶段', link: '/guide/toolchain/q-build-link' },
          { text: 'Makefile 基础', link: '/guide/toolchain/q-makefile' },
        ],
      },
    ],
  },
  {
    text: '方法论与真题',
    collapsed: false,
    items: [
      { text: '备考与方法论', link: '/guide/method/' },
    ],
  },
]

export default defineConfig({
  lang: 'zh-CN',
  base: base(),
  title: '嵌入式八股面试手册',
  description: '嵌入式软件工程师高频八股：题卡 + 标准答案 + 为什么 + 自测（本地优先）',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#2f5e9d' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '手册', link: '/guide/readme' },
      { text: '自测刷题', link: '/study' },
      { text: 'GitHub', link: repoUrl },
    ],
    sidebar,
    outline: { level: [2, 3], label: '本页目录' },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清除查询',
            backButtonTitle: '返回',
            noResultsText: '无匹配结果',
            footer: { selectText: '选择', selectKeyAriaLabel: '回车', navigateText: '切换', navigateUpKeyAriaLabel: '上箭', navigateDownKeyAriaLabel: '下箭' },
          },
        },
      },
    },
    footer: {
      message: '基于 VitePress 构建 · 内容本地优先 · 仅供个人学习参考',
      copyright: '© 2026 嵌入式八股手册',
    },
    docFooter: { prev: '上一页', next: '下一页' },
    darkModeSwitchLabel: '主题',
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '目录',
  },
})
