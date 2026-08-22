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
          { text: '函数指针与回调', link: '/guide/c/q-function-pointer' },
          { text: '无符号数与整型陷阱', link: '/guide/c/q-unsigned-trap' },
          { text: '宏 vs 内联函数', link: '/guide/c/q-macro-inline' },
          { text: '内存池与静态分配', link: '/guide/c/q-memory-pool' },
          { text: '数组指针 vs 指针数组', link: '/guide/c/q-pointer-array' },
          { text: 'extern 与头文件', link: '/guide/c/q-extern' },
          { text: '程序内存布局', link: '/guide/c/q-memory-layout' },
          { text: '联合体 union', link: '/guide/c/q-union' },
          { text: '可重入与线程安全', link: '/guide/c/q-reentrant' },
          { text: '位域做协议解析', link: '/guide/c/q-bitfield-protocol' },
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
          { text: '自旋锁 vs 睡眠锁', link: '/guide/os/q-spinlock' },
          { text: '系统调用 vs 库函数', link: '/guide/os/q-syscall-libc' },
          { text: '实时性与时延', link: '/guide/os/q-realtime' },
          { text: 'RTOS 调度与时间片', link: '/guide/os/q-rtos-schedule' },
          { text: '中断标志位与协作', link: '/guide/os/q-isr-main-coop' },
          { text: 'Linux 进程间通信 IPC', link: '/guide/os/q-ipc' },
          { text: 'FreeRTOS 队列与内存', link: '/guide/os/q-freertos-memory' },
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
          { text: '内存泄漏与 OOM', link: '/guide/linux/q-oom-leak' },
          { text: 'mmap 映射与零拷贝', link: '/guide/linux/q-mmap-zero-copy' },
          { text: '驱动模型三件套', link: '/guide/linux/q-driver-model' },
          { text: '内核模块与参数', link: '/guide/linux/q-kernel-module' },
          { text: '字符设备驱动流程', link: '/guide/linux/q-char-driver' },
          { text: 'TCP 三次握手/挥手', link: '/guide/linux/q-tcp-handshake' },
          { text: 'DMA 与 Cache 一致性', link: '/guide/linux/q-dma-cache' },
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
          { text: 'STM32 启动过程', link: '/guide/arm/q-stm32-boot' },
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
          { text: 'NOR vs NAND Flash', link: '/guide/bus/q-flash-nor-nand' },
          { text: 'SPI 时序 CPOL/CPHA', link: '/guide/bus/q-spi-cpol-cpha' },
          { text: 'I2C 时序（Start/ACK/拉伸）', link: '/guide/bus/q-i2c-timing' },
        ],
      },
    ],
  },
  {
    text: '单片机理与开发基础',
    collapsed: false,
    items: [
      { text: 'MCU 概览', link: '/guide/mcu/' },
      {
        text: '高频题',
        items: [
          { text: 'GPIO 配置与上下拉', link: '/guide/mcu/q-gpio-config' },
          { text: '低功耗与电源管理', link: '/guide/mcu/q-low-power' },
          { text: 'ADC 采样与滤波', link: '/guide/mcu/q-adc' },
          { text: '定时器与 PWM', link: '/guide/mcu/q-timer-pwm' },
          { text: 'STM32 时钟树', link: '/guide/mcu/q-stm32-clock' },
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
          { text: '交叉编译', link: '/guide/toolchain/q-cross-compile' },
          { text: 'gcc 优化等级与 volatile', link: '/guide/toolchain/q-opt' },
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
