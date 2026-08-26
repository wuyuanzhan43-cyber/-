---
title: SysTick 中断在 RTOS 中扮演什么角色
id: systick-role
category: rtos
difficulty: 4
tags: [RTOS, SysTick, tick, 调度, Cortex-M]
company: [智驾, 大疆, 中兴]
keywords: SysTick tick xTickCount 时基 延时 超时 时间片 调度心跳 configTICK_RATE_HZ
answer: |
  **SysTick（系统滴答定时器）是 Cortex-M 的时基，RTOS 用它做"系统时钟/tick"**。它是 **24 位递减计数器**，每过 `configTICK_RATE_HZ` 的倒数时间产生一次中断，是 RTOS 的"**心跳**"。

  ### 核心角色
  1. **产生周期性 tick 中断**：`xPortSysTickHandler` 在每次 SysTick 到期时被调用，推进系统时间。
  2. **推进系统时钟 `xTickCount`**：每次 tick 使 `xTickCount` 递增——它是**任务延时、超时、时间片**的时间基准。
  3. **驱动调度器**：**tick 中断里检查**「是否有任务从延时列表到期 / 时间片是否到」，若有就**挂起 PendSV** 请求切换（`portYIELD_FROM_ISR`）——所以 "tick" 是**触发调度的节拍器**。
  4. **时间片轮转**：同优先级任务靠 tick 计数计时，一个时间片用完就切换（`configUSE_TIME_SLICING`）。
  5. **延时/超时基准**：`vTaskDelay`、`vTaskDelayUntil`、队列/信号量超时都基于 `xTickCount`。

  ### 配置要点
  - `configTICK_RATE_HZ` 决定 tick 频率（如 1000Hz=1ms 一拍）。
  - SysTick 中断优先级要设成**允许调用 RTOS API**（在 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 允许范围内，即数值更大），否则会被临界区屏蔽。
why: |
  没有 tick，RTOS 就"**没有时间概念**"：任务延时无从计算、超时无法触发、时间片无法轮转。SysTick 就是这个"**时间心跳**"。
  - **为什么用 SysTick 而不是普通定时器**：Cortex-M 内建、无需额外频外设、频率可配、专为 RTOS 设计。
  - **为什么 tick 中断要挂起 PendSV**：tick 中断里判断"该切换了"，但**不能在自己（中断）里切**，只**挂起 PendSV 做标记**，等回任务态再真正切换——所以 SysTick 是"**调度请求的触发器**"，PendSV 是"**切换的执行者**"。
  - **tick 频率怎么选**：频率越高，实时响应越细但**CPU 占用和中断开销越大**；要平衡 `configTICK_RATE_HZ`（常见 100~1000Hz）。
---
<FlashCard />

## 深读

### SysTick 寄存器

| 寄存器 | 作用 |
|---|---|
| `SysTick->CTRL` | 使能(`ENABLE`)、时钟(`CLKSOURCE`)、计数到零中断(`TICKINT`)、计数标志(`COUNTFLAG`) |
| `SysTick->LOAD` | 重载值（24 位），`RELOAD = (freq / configTICK_RATE_HZ) - 1` |
| `SysTick->VAL` | 当前计数值（写 0 清零） |

- 时钟源可选手: **`CLKSOURCE=1` 用处理器时钟（HCLK）**，`0` 用 `HCLK/8`（需配置）。
- 例：`configTICK_RATE_HZ=1000`、CPU 72MHz → `LOAD = (72e6/1000) - 1 = 71999`，每 1ms 一次 tick。

### SysTick 驱动的调度链路

```
SysTick 到期
  → xPortSysTickHandler(): xTickCount++
  → 检查延时列表: 有任务到期? / 时间片到?
  → 若是: 把到期任务移入就绪链 + portYIELD_FROM_ISR(挂起 PendSV)
  → ISR 结束回到任务态
  → PendSV 进入: 真正切换(选最高就绪任务)
```

### 源码级：`xPortSysTickHandler` 做了什么

```c
void xPortSysTickHandler(void) {
  /* 关中断防止中断里同时改 tick */
  portDISABLE_INTERRUPTS();
  if (xTaskIncrementTick() != pdFALSE) {
    /* 有更高优先级任务就绪 → 请求切换 */
    portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;  // 挂起 PendSV
  }
  portENABLE_INTERRUPTS();
}
```
- `xTaskIncrementTick()`：`xTickCount++`、把到期任务从延时列表移到就绪、处理时间片，返回"是否有更高优先级任务就绪"。
- 若 `portNVIC_INT_CTRL_REG = PENDSVSET`（`SCB->ICSR.PENDSVSET`）→ 挂起 PendSV，等回任务态切。

### SysTick vs PendSV vs SVC（再次对齐）

| 异常 | 角色 | 关系 |
|---|---|---|
| **SysTick** | 时基/tick | 推进时钟、触发"该切换了" |
| **PendSV** | 上下文切换 | 真正执行切换（最低优先级） |
| **SVC** | 启动首个任务 | 首次调度 |

### 工程场景

- **症状**：延时/超时漂移，或 tick 停止（调度死、任务饿死）。
- **根因/排查**：`configTICK_RATE_HZ` 与 `LOAD` 计算错、SysTick 优先级被临界区屏蔽（优先级设过小）、时钟源选错。
- **对策**：按 CPU 频率正确算 `LOAD`；SysTick 优先级设在 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 允许范围；确认 `CLKSOURCE` 与系统时钟匹配。

### 进阶追问链

1. **Q：SysTick 中断优先级怎么设？** → 要能调 RTOS API，优先级须在 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 之后（数值更大）；设太高会被临界区屏蔽，导致 tick 不进、延时错乱。
2. **Q：为什么 tick 中断里不能直接切换，只挂起 PendSV？** → tick 中断是中断上下文，里面不能调度/切任务；只"判断+tick++"，真正切换交给最低优先级 PendSV，回任务态后切。
3. **Q：`configTICK_RATE_HZ` 设多大合适？** → 看实时需求与 CPU 预算。高频响应细但中断开销大；低频省 CPU 但响应粗。常取 100~1000Hz，高精度用硬件定时器补。
4. **Q：`xTaskIncrementTick` 返回什么？** → 返回"是否有更高优先级任务就绪"（`pdTRUE`）；调用方据此决定是否挂起 PendSV 请求切换。

> 📌 一句话记忆：**SysTick＝Cortex-M 内建24位滴答定时器(CTRL/LOAD/VAL)：每configTICK_RATE_HZ一次tick中断，xPortSysTickHandler推进xTickCount并驱动调度(延时/超时/时间片)；tick中断里只判断+挂起(SCB->ICSR.PENDSVSET)PendSV，真正切换交给PendSV；优先级要允许调用RTOS API，LOAD=(freq/tickHz)-1。**
