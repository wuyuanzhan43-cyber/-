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
          { text: '系统调用 vs 库函数', link: '/guide/os/q-syscall-libc' },
          { text: '进程生命周期（僵尸/孤儿）', link: '/guide/os/q-process-lifecycle' },
          { text: '进程调度算法', link: '/guide/os/q-scheduling' },
          { text: '虚拟内存与分页', link: '/guide/os/q-virtual-memory' },
          { text: '死锁', link: '/guide/os/q-deadlock' },
          { text: '线程同步进阶', link: '/guide/os/q-thread-sync' },
          { text: '信号量 vs 互斥锁', link: '/guide/os/q-semaphore-mutex' },
          { text: '自旋锁 vs 睡眠锁', link: '/guide/os/q-spinlock' },
          { text: 'RTOS 优先级反转', link: '/guide/os/q-priority-inversion' },
          { text: '中断上下文', link: '/guide/os/q-interrupt-context' },
          { text: '中断嵌套与优先级', link: '/guide/os/q-interrupt-nesting' },
          { text: '中断标志位与协作', link: '/guide/os/q-isr-main-coop' },
          { text: 'RTOS 调度与时间片', link: '/guide/os/q-rtos-schedule' },
          { text: 'RTOS 任务通信', link: '/guide/os/q-task-comm' },
          { text: 'FreeRTOS 队列与内存', link: '/guide/os/q-freertos-memory' },
          { text: 'Linux 进程间通信 IPC', link: '/guide/os/q-ipc' },
          { text: '多核 SMP/AMP', link: '/guide/os/q-multicore' },
          { text: '实时性与时延', link: '/guide/os/q-realtime' },
          { text: '看门狗 Watchdog', link: '/guide/os/q-watchdog' },
          { text: 'FreeRTOS 任务与调度源码', link: '/guide/os/q-freertos-task-src' },
          { text: 'FreeRTOS 队列源码', link: '/guide/os/q-freertos-queue-src' },
          { text: 'OSAL 抽象层', link: '/guide/os/q-osal' },
        ],
      },
    ],
  },
  {
    text: 'STM32 + FreeRTOS 深挖',
    collapsed: false,
    items: [
      { text: '深挖概览与自测清单', link: '/guide/rtos/' },
      {
        text: '基础概念',
        items: [
          { text: 'Q1 现场保护 vs 任务上下文', link: '/guide/rtos/q-isr-save-vs-task-context' },
          { text: 'Q2 中断现场保存哪些寄存器', link: '/guide/rtos/q-isr-save-registers' },
          { text: 'Q3 任务上下文保存内容与位置', link: '/guide/rtos/q-task-context-save' },
          { text: 'Q4 PendSV 的作用', link: '/guide/rtos/q-pendsv' },
        ],
      },
      {
        text: '中断与现场保护',
        items: [
          { text: 'Q5 硬件自动压栈哪些寄存器', link: '/guide/rtos/q-hw-save-registers' },
          { text: 'Q6 中断里能调用 vTaskDelay 吗', link: '/guide/rtos/q-vtaskdelay-in-isr' },
          { text: 'Q7 中断优先级 vs 任务优先级', link: '/guide/rtos/q-interrupt-vs-task-priority' },
          { text: 'Q8 ISR 过长会怎样', link: '/guide/rtos/q-long-isr' },
        ],
      },
      {
        text: '任务切换与上下文',
        items: [
          { text: 'Q9 任务切换完整流程', link: '/guide/rtos/q-task-switch-flow' },
          { text: 'Q10 TCB 里保存了哪些信息', link: '/guide/rtos/q-tcb-fields' },
          { text: 'Q11 任务栈溢出检测与后果', link: '/guide/rtos/q-stack-overflow-detect' },
          { text: 'Q12 SysTick 的角色', link: '/guide/rtos/q-systick-role' },
        ],
      },
      {
        text: 'RTOS 核心机制',
        items: [
          { text: 'Q13 信号量 vs 互斥锁', link: '/guide/rtos/q-rtos-sem-mutex' },
          { text: 'Q14 消息队列 vs 任务通知', link: '/guide/rtos/q-rtos-queue-notify' },
          { text: 'Q15 优先级反转与解决', link: '/guide/rtos/q-rtos-priority-inversion' },
          { text: 'Q16 共享资源数据一致性', link: '/guide/rtos/q-rtos-shared-resource' },
        ],
      },
      {
        text: '工程落地',
        items: [
          { text: 'Q17 中断收数据传给任务', link: '/guide/rtos/q-isr-to-task-comm' },
          { text: 'Q18 看门狗配合 RTOS', link: '/guide/rtos/q-watchdog-rtos' },
          { text: 'Q19 死机保留现场', link: '/guide/rtos/q-crash-context-preserve' },
          { text: 'Q20 裸机移植 RTOS', link: '/guide/rtos/q-baremetal-to-rtos' },
        ],
      },
      {
        text: '调试与排查',
        items: [
          { text: 'Q21 HardFault 定位', link: '/guide/rtos/q-hardfault-locate' },
          { text: 'Q22 任务栈溢出排查', link: '/guide/rtos/q-stack-overflow-debug' },
          { text: 'Q23 卡死但看门狗没复位', link: '/guide/rtos/q-stuck-no-reset' },
          { text: 'Q24 CPU 占用率测量', link: '/guide/rtos/q-cpu-usage-measure' },
        ],
      },
    ],
  },
  {
    text: 'RT-Thread 深挖',
    collapsed: false,
    items: [
      { text: 'RT-Thread 概览与学习主线', link: '/guide/rtthread/' },
      {
        text: '内核与调度',
        items: [
          { text: '架构与内核对象模型', link: '/guide/rtthread/q-rtthread-arch' },
          { text: '线程调度与就绪位图 O(1)', link: '/guide/rtthread/q-rtthread-sched' },
          { text: '线程控制块与状态机', link: '/guide/rtthread/q-rtthread-thread' },
        ],
      },
      {
        text: 'IPC 与内存',
        items: [
          { text: '同步：信号量/互斥锁/事件集', link: '/guide/rtthread/q-rtthread-sync' },
          { text: '通信：消息队列/邮箱/信号', link: '/guide/rtthread/q-rtthread-ipc' },
          { text: '内存管理：内存池/SLAB/Buddy', link: '/guide/rtthread/q-rtthread-memory' },
        ],
      },
      {
        text: '中断/定时器/设备',
        items: [
          { text: '中断管理与中断内 IPC', link: '/guide/rtthread/q-rtthread-interrupt' },
          { text: '定时器（软/硬）与 tick', link: '/guide/rtthread/q-rtthread-timer' },
          { text: '设备框架与驱动模型', link: '/guide/rtthread/q-rtthread-device' },
        ],
      },
      {
        text: '工程与选型',
        items: [
          { text: '启动与自动初始化', link: '/guide/rtthread/q-rtthread-boot' },
          { text: '构建：Env/Kconfig/SConscript', link: '/guide/rtthread/q-rtthread-build' },
          { text: 'RT-Thread vs FreeRTOS', link: '/guide/rtthread/q-rtthread-vs-freertos' },
        ],
      },
    ],
  },
  {
    text: '架构与并发进阶',
    collapsed: false,
    items: [
      { text: '架构与并发进阶概览', link: '/guide/arch/' },
      {
        text: '高频题',
        items: [
          { text: '无锁编程 / 原子 / MPSC / 内存屏障', link: '/guide/arch/q-lockfree-mpsc' },
          { text: 'C 的面向对象 / 设计模式 / 驱动模型', link: '/guide/arch/q-oop-in-c' },
          { text: '完成量 / workqueue / 异步机制', link: '/guide/arch/q-completion-workqueue' },
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
          { text: '大小端', link: '/guide/arm/q-endian' },
          { text: 'ARM 寄存器与工作模式', link: '/guide/arm/q-arm-registers' },
          { text: 'ARM 指令集与流水线', link: '/guide/arm/q-arm-instruction' },
          { text: 'ARM 异常处理流程', link: '/guide/arm/q-arm-exception' },
          { text: '异常向量表与启动', link: '/guide/arm/q-exception-vector' },
          { text: 'STM32 启动过程', link: '/guide/arm/q-stm32-boot' },
          { text: '中断控制器 NVIC/GIC', link: '/guide/arm/q-nvic-gic' },
          { text: 'MMU vs MPU', link: '/guide/arm/q-mmu-vs-mpu' },
          { text: 'MMU 与内存管理', link: '/guide/arm/q-mmu' },
          { text: 'Cortex-M 硬件与 FreeRTOS 移植', link: '/guide/arm/q-cortexm-port' },
          { text: 'RISC-V 基础与青稞V4双核', link: '/guide/arm/q-riscv' },
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
          { text: 'UART 深入（帧/波特率/流控）', link: '/guide/bus/q-uart-deep' },
          { text: 'I2C 时序（Start/ACK/拉伸）', link: '/guide/bus/q-i2c-timing' },
          { text: 'SPI 时序 CPOL/CPHA', link: '/guide/bus/q-spi-cpol-cpha' },
          { text: 'RS485 与 Modbus', link: '/guide/bus/q-rs485-modbus' },
          { text: 'LIN 总线', link: '/guide/bus/q-lin' },
          { text: 'CAN 总线', link: '/guide/bus/q-can' },
          { text: 'CAN 帧/仲裁/错误处理', link: '/guide/bus/q-can-arbitration' },
          { text: 'USB 基础（枚举/端点）', link: '/guide/bus/q-usb' },
          { text: '以太网 MAC/PHY', link: '/guide/bus/q-ethernet' },
          { text: 'NOR vs NAND Flash', link: '/guide/bus/q-flash-nor-nand' },
          { text: 'DMA 与中断/轮询', link: '/guide/bus/q-dma' },
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
          { text: 'MCU 内存映射与存储', link: '/guide/mcu/q-mcu-memory-map' },
          { text: '位带操作（Cortex-M）', link: '/guide/mcu/q-bit-band' },
          { text: 'GPIO 配置与上下拉', link: '/guide/mcu/q-gpio-config' },
          { text: '定时器与 PWM', link: '/guide/mcu/q-timer-pwm' },
          { text: 'ADC 采样与滤波', link: '/guide/mcu/q-adc' },
          { text: 'RTC 实时时钟', link: '/guide/mcu/q-rtc' },
          { text: 'STM32 时钟树', link: '/guide/mcu/q-stm32-clock' },
          { text: 'STM32 中断配置（NVIC/EXTI）', link: '/guide/mcu/q-nvic-exti' },
          { text: 'MCU 串口外设（收发/中断/DMA）', link: '/guide/mcu/q-mcu-uart' },
          { text: 'Cortex-M 低功耗与唤醒', link: '/guide/mcu/q-cortexm-lowpower' },
          { text: '低功耗与电源管理', link: '/guide/mcu/q-low-power' },
        ],
      },
    ],
  },
  {
    text: '边缘 AI（TFLM / 量化 / 部署）',
    collapsed: false,
    items: [
      { text: '边缘 AI 概览', link: '/guide/ai/' },
      {
        text: '高频题',
        items: [
          { text: 'INT8 量化原理（scale/zero_point/校准）', link: '/guide/ai/q-tflm-int8' },
          { text: 'tensor arena 与内存规划', link: '/guide/ai/q-tensor-arena' },
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
      { text: '面试金句速记', link: '/guide/method/quotes' },
      { text: '吴沅展针对性学习地图', link: '/guide/method/targeted-training' },
      { text: '部署与推拉记忆', link: '/guide/method/deploy-memory' },
    ],
  },
  {
    text: '吴沅展针对性训练',
    collapsed: false,
    items: [
      { text: '训练总览', link: '/guide/training/' },
      {
        text: '嵌入式底子（C/OS/总线/MCU）',
        items: [
          { text: '指针 vs 数组', link: '/guide/training/q-base-c-pointer-array' },
          { text: '程序内存布局', link: '/guide/training/q-base-c-memory-layout' },
          { text: 'volatile 作用', link: '/guide/training/q-base-c-volatile' },
          { text: '结构体内存对齐', link: '/guide/training/q-base-c-alignment' },
          { text: '位操作与位域', link: '/guide/training/q-base-c-bitops' },
          { text: 'static/const/extern', link: '/guide/training/q-base-c-storage-class' },
          { text: '无符号数与整型陷阱', link: '/guide/training/q-base-c-unsigned' },
          { text: '函数指针与回调', link: '/guide/training/q-base-c-funcptr' },
          { text: '进程/线程/任务', link: '/guide/training/q-base-os-proc-thread' },
          { text: 'RTOS 任务状态与调度', link: '/guide/training/q-base-os-sched' },
          { text: '信号量 vs 互斥锁', link: '/guide/training/q-base-os-sync' },
          { text: '中断上下文', link: '/guide/training/q-base-os-interrupt' },
          { text: '栈/堆/分配', link: '/guide/training/q-base-os-memory' },
          { text: 'UART 帧/波特率/电平', link: '/guide/training/q-base-bus-uart' },
          { text: 'I2C vs SPI vs UART', link: '/guide/training/q-base-bus-i2c-spi' },
          { text: 'CAN 总线', link: '/guide/training/q-base-bus-can' },
          { text: 'ARM 启动/异常/大小端', link: '/guide/training/q-base-arm-boot' },
          { text: 'GPIO/定时器PWM/ADC', link: '/guide/training/q-base-mcu-gpio-timer' },
        ],
      },
      {
        text: '项目一·深挖预判',
        items: [
          { text: '双核架构与 HSEM', link: '/guide/training/q-project1-dualcore-hsem' },
          { text: 'INT8 量化 + tensor arena', link: '/guide/training/q-project1-edgeai-quant' },
          { text: 'BLE 传输与粘包/拆包', link: '/guide/training/q-project1-ble-frame' },
          { text: '指标：准确率/耗时/内存', link: '/guide/training/q-project1-metrics' },
        ],
      },
      {
        text: '项目二·深挖预判',
        items: [
          { text: '分层架构与驱动模型', link: '/guide/training/q-project2-layered-arch' },
          { text: '无锁 / 原子 / MPSC / bufpool', link: '/guide/training/q-project2-lockfree' },
          { text: '零拷贝：DMA+PingPongbuf', link: '/guide/training/q-project2-zerocopy' },
          { text: '完成量 / workqueue', link: '/guide/training/q-project2-sync' },
        ],
      },
      {
        text: '补充·针对性',
        items: [
          { text: '边缘 AI 端云协同全链路', link: '/guide/training/q-edgeai-deploy' },
          { text: 'RISC-V 双核对照与迁移', link: '/guide/training/q-riscv-dualcore' },
        ],
      },
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
