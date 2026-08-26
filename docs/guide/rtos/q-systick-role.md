---
title: SysTick 中断在 RTOS 中扮演什么角色
id: systick-role
category: rtos
difficulty: 4
tags: [RTOS, SysTick, tick, 调度, Cortex-M]
company: [智驾, 大疆, 中兴]
keywords: SysTick tick xTickCount 时基 延时 超时 时间片 调度心跳
answer: |
  **SysTick（系统滴答定时器）是 Cortex-M 的时基，RTOS 用它做"系统时钟/tick"**。它是**24 位递减计数器**，每过 `configTICK_RATE_HZ` 的倒数时间产生一次中断，是 RTOS 的"**心跳**"。

  核心角色：
  1. **产生周期性 tick 中断**：`xPortSysTickHandler` 在每次 SysTick 到期时被调用，推进系统时间。
  2. **推进系统时钟 `xTickCount`**：每次 tick 使 `xTickCount` 递增——它是**任务延时、超时、时间片**的时间基准。
  3. **驱动调度器**：**tick 中断里检查**「是否有任务从延时列表到期 / 时间片是否到」，若有就**挂起 PendSV** 请求切换（`portYIELD_FROM_ISR`）——所以 "tick" 是**触发调度的节拍器**。
  4. **时间片轮转**：同优先级任务靠 tick 计数计时，一个时间片用完就切换（`configUSE_TIME_SLICING`）。
  5. **延时/超时基准**：`vTaskDelay`、`vTaskDelayUntil`、队列/信号量超时都基于 `xTickCount`。

  **配置要点**：`configTICK_RATE_HZ` 决定 tick 频率（如 1000Hz=1ms 一拍）；SysTick 中断优先级要设成**允许调用 RTOS API**（在 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 允许的范围内，即数值更大），否则会被临界区屏蔽。
why: |
  没有 tick，RTOS 就"**没有时间概念**"：任务延时无从计算、超时无法触发、时间片无法轮转。SysTick 就是这个"**时间心跳**"。
  - **为什么用 SysTick 而不是普通定时器**：Cortex-M 内建、无需频外设、频率可配、专为 RTOS 设计。
  - **为什么 tick 中断要挂起 PendSV**：tick 中断里判断"该切换了"，但**不能在自己（中断）里切**，只**挂起 PendSV 做标记**，等回任务态再真正切换——所以 SysTick 是"**调度请求的触发器**"，PendSV 是"**切换的执行者**"。
  - **tick 频率怎么选**：频率越高，实时响应越细但**CPU 占用和中断开销越大**；要平衡 `configTICK_RATE_HZ`（常见 100~1000Hz）。
---
<FlashCard />

## 深读

### SysTick 驱动的调度链路

```
SysTick 到期
  → xPortSysTickHandler(): xTickCount++ 
  → 检查延时列表: 有任务到期? / 时间片到?
  → 若是: 把到期任务移入就绪链 + portYIELD_FROM_ISR(挂起 PendSV)
  → ISR 结束回到任务态
  → PendSV 进入: 真正切换(选最高就绪任务)
```

### SysTick vs PendSV vs SVC（再次对齐）

| 异常 | 角色 | 关系 |
|---|---|---|
| **SysTick** | 时基/tick | 推进时钟、触发"该切换了" |
| **PendSV** | 上下文切换 | 真正执行切换（最低优先级） |
| **SVC** | 启动首个任务 | 首次调度 |

### tick 频率与系统开销

| tick 频率 | 粒度 | 代价 |
|---|---|---|
| 100 Hz | 10ms 一拍 | 中断少、CPU 省，但实时响应粗 |
| 1000 Hz | 1ms 一拍 | 中断频繁、响应细，CPU/功耗略增 |
| 更高 | 更细 | 中断开销显著，需权衡 |

- 实时性强的任务若需更细的时基，可用**硬件定时器中断**做高精度事件，而 tick 仍管调度。

### 常见追问

- **Q：SysTick 中断优先级怎么设？**
  A：要能调用 RTOS API，所以其优先级**必须在 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 之后（数值更大）**；若设得太高（数值更小）会被临界区屏蔽，导致 tick 不进、延时错乱。

- **Q：为什么 tick 中断里不能直接切换，而只挂起 PendSV？**
  A：tick 中断是**中断上下文**，里面**不能调度/切任务**。所以它只"判断+tick++”，把真正切换交给**最低优先级的 PendSV**，回到任务态后才切。

- **Q：`configTICK_RATE_HZ` 设多大合适？**
  A：**看实时需求与 CPU 预算**。高频（如 1000Hz）响应细但中断开销大；低频省 CPU 但响应粗。通常兼顾二者，取 100~1000Hz，并用硬件定时器补高精度。

> 📌 一句话记忆：**SysTick＝Cortex-M 内建滴答定时器：每 configTICK_RATE_HZ 一次 tick 中断，推进 xTickCount 并驱动调度(延时/超时/时间片)；tick 中断里只判断+挂起 PendSV，真正切换交给PendSV；优先级要允许调用RTOS API，频率看实时与CPU预算。**
