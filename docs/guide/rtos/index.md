---
title: STM32 + FreeRTOS 深挖（中断与任务上下文）
---

# STM32 + FreeRTOS 深挖（中断与任务上下文）

> 这是一套**以真实 STM32 + FreeRTOS 岗位面试为蓝本**的自测清单。简历上写「熟练 STM32 和 FreeRTOS」，一进到「**中断现场保护**」和「**任务上下文切换**」就会被追问到原理层。
> 本菜单把 24 道题按 **基础概念 → 中断与现场保护 → 任务切换与上下文 → RTOS 核心机制 → 工程落地 → 调试与排查** 六个递进阶段组织。能扛住一半以上，面试基本稳了；答不上来的正好查漏补缺。

## 段位自测（自评）

| 能答上 | 段位 | 说明 |
|---|---|---|
| ≤ 8 题 | 入门 | 概念知道，原理层薄弱，重点补「现场保护 / TCB / PendSV」 |
| 9 ~ 15 题 | 合格 | 能用 RTOS，但中断与调度的**底层因果**还不牢 |
| 16 ~ 21 题 | 熟练 | 常见机制与坑都清楚，可深入「源码级 / 调试级」追问 |
| 22 ~ 24 题 | 稳 | 中断、调度、内存、调试整套闭环，基本无死角 |

> 自测定位：**这个岗位要把「为什么」讲清楚**，不是背答案。每题都请尝试用「**它解决什么问题 → 怎么实现 → 出了问题怎么办**」三段式讲。

---

## 一、基础概念（Q1–Q4）

- [Q1 中断现场保护 vs 任务上下文切换的核心区别是什么？](/guide/rtos/q-isr-save-vs-task-context)
- [Q2 中断现场保护通常保存哪些寄存器？由谁负责保存？](/guide/rtos/q-isr-save-registers)
- [Q3 任务上下文切换保存哪些内容？保存在哪里？](/guide/rtos/q-task-context-save)
- [Q4 PendSV 异常在 FreeRTOS 中的作用是什么？](/guide/rtos/q-pendsv)

## 二、中断与现场保护（Q5–Q8）

- [Q5 中断响应流程中，硬件自动保存了哪些寄存器？](/guide/rtos/q-hw-save-registers)
- [Q6 中断服务程序里能调用 vTaskDelay 吗？为什么？](/guide/rtos/q-vtaskdelay-in-isr)
- [Q7 中断优先级和任务优先级谁更高？冲突时怎么处理？](/guide/rtos/q-interrupt-vs-task-priority)
- [Q8 中断服务程序执行时间过长会有什么后果？](/guide/rtos/q-long-isr)

## 三、任务切换与上下文（Q9–Q12）

- [Q9 FreeRTOS 任务切换的完整流程是什么？](/guide/rtos/q-task-switch-flow)
- [Q10 任务控制块（TCB）里保存了哪些信息？](/guide/rtos/q-tcb-fields)
- [Q11 任务栈溢出怎么检测？会导致什么问题？](/guide/rtos/q-stack-overflow-detect)
- [Q12 SysTick 中断在 RTOS 中扮演什么角色？](/guide/rtos/q-systick-role)

## 四、RTOS 核心机制（Q13–Q16）

- [Q13 信号量和互斥锁的区别？什么时候用哪个？](/guide/rtos/q-rtos-sem-mutex)
- [Q14 消息队列和任务通知各自适用什么场景？](/guide/rtos/q-rtos-queue-notify)
- [Q15 优先级反转是什么？怎么排查和解决？](/guide/rtos/q-rtos-priority-inversion)
- [Q16 多任务共享资源时，怎么保证数据一致性？](/guide/rtos/q-rtos-shared-resource)

## 五、工程落地（Q17–Q20）

- [Q17 中断里收到数据，怎么安全地传递给任务？](/guide/rtos/q-isr-to-task-comm)
- [Q18 看门狗怎么配合 RTOS 使用？](/guide/rtos/q-watchdog-rtos)
- [Q19 系统死机了，怎么保留现场信息？](/guide/rtos/q-crash-context-preserve)
- [Q20 裸机代码移植到 RTOS 要注意哪些问题？](/guide/rtos/q-baremetal-to-rtos)

## 六、调试与排查（Q21–Q24）

- [Q21 HardFault 怎么定位？通过哪些寄存器分析？](/guide/rtos/q-hardfault-locate)
- [Q22 任务栈溢出怎么排查？有什么工具？](/guide/rtos/q-stack-overflow-debug)
- [Q23 系统卡死但看门狗没复位，怎么查？](/guide/rtos/q-stuck-no-reset)
- [Q24 RTOS 运行时 CPU 占用率怎么测量？](/guide/rtos/q-cpu-usage-measure)

---

## 核心主线（贯穿这 24 题的三条线）

1. **现场（上下文）到底是谁保存的**：Cortex-M **硬件自动压栈** R0–R3/R12/LR/PC/xPSR，FreeRTOS 在中断/切换里**手动再压** R4–R11。分清「硬件做 vs 软件做」是区分「会用」与「理解」的分水岭。
2. **临界区与调度纪律**：中断里**不可阻塞/不可调度**——只做短、原子的动作，把重活通过**队列/信号量/任务通知（FromISR 版）**交给任务。
3. **出了问题看哪里**：卡死、栈溢出、HardFault、CPU 占用，都能落到**寄存器（PSR/LR/SP/SHCSR/CFSR/HFSR）**和 **TCB/就绪链表**上定位。

## 相关章节

- [操作系统与 RTOS](/guide/os/)：信号量 vs 互斥锁、优先级反转、中断上下文等**通用机制**的对照版。
- [ARM 体系与启动](/guide/arm/)：Cortex-M 异常处理、异常向量表、Cortex-M 硬件与 FreeRTOS 移植。
- [单片机理与开发基础](/guide/mcu/)：STM32 中断配置（NVIC/EXTI）、STM32 时钟树。
