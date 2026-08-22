---
title: Cortex-M 硬件基础与 FreeRTOS 移植
id: cortexm-port
category: arm
difficulty: 4
tags: [Cortex-M, FreeRTOS, 移植]
company: [智驾, 大疆]
keywords: Cortex-M SysTick PendSV SVC 上下文切换 临界区 栈初始化
answer: |
  把 FreeRTOS 移植到新 MCU，关键在于**移植层（`port.c`/`portmacro.h`）**，它依赖 Cortex-M 的这几个硬件点：

  1. **SysTick**：系统**滴答（tick）时基**，周期中断驱动调度与延时。
  2. **PendSV**：**可挂起的系统服务中断**（优先级**最低**），用作**上下文切换**——好处是**不打断 ISR**，只在没有更高优先级中断时才真正切换（ISR 只标记，返回时切换）。
  3. **SVC**：系统服务调用，用于**启动第一个任务**（触发首次调度）。
  4. **异常自动压栈**：Cortex-M 进异常时**硬件自动压栈** R0-R3/R12/LR/PC/xPSR；FreeRTOS 在此基础上保存/恢复 R4-R11 等剩余寄存器。
  5. **栈初始化**：初始栈顶、栈增长方向（向低地址）；`pxPortInitialiseStack` 生成初始栈帧（含 `EXC_RETURN`，返回时据其选 MSP/PSP）。
  6. **临界区**：关中断（`PRIMASK`/`basepri`）或**挂起调度器**（`vTaskSuspendAll`）；`configMAX_SYSCALL_INTERRUPT_PRIORITY` 保留**高于此优先级**的硬实时中断（不被临界区屏蔽）。
  7. **上下文切换汇编**：`vPortPendSVHandler`（PendSV 里保存/恢复寄存器栈）、`vPortSVCHandler`（首次启动）。
why: |
  移植/理解 FreeRTOS 在新芯片上跑，核心是 **tick(SysTick) + 上下文切换(PendSV) + 临界区(关中断/挂起调度) + 栈初始化** 四件事。
  Cortex-M 的**硬件自动压栈**帮 FreeRTOS 省去手动保存现场；**PendSV 最低优先级**保证“切任务不打断正在执行的 ISR”；**SVC/PendSV + EXC_RETURN** 完成寄存器组切换。读懂这几块，就能定位“为什么卡死、为什么切不过来、为什么临界区失效、为什么中断里不能阻塞”。
---
<FlashCard />

## 深读

### 移植层要实现的 4 件事

| 事项 | 依赖 | 作用 |
|---|---|---|
| tick 时基 | SysTick 中断 | 周期性驱动调度/延时 |
| 上下文切换 | PendSV（最低优先） | 切换任务；不打断 ISR |
| 首次启动 | SVC | 触发第一个任务 |
| 临界区 | PRIMASK/basepri / vTaskSuspendAll | 保护共享/原子 |

### 为什么 PendSV 做切换

- PendSV 优先级**最低**，意味着它**不可能抢占正在运行的 ISR**。
- 中断发生于“切换中途”时，只**标记 PendSV 挂起**，等所有 ISR 结束、回到任务态才真正切换——**避免在中断里切换任务**。

### Cortex-M 自动压栈 + 手动压栈

- **硬件自动**：进异常压 R0-R3/R12/LR/PC/xPSR（8 个字）。
- **FreeRTOS 手动再压** R4-R11（+可能浮点），保存“当前任务”的现场。
- 恢复时反向：弹 R4-R11, 再弹硬件压的 8 个字，用 `EXC_RETURN` 选 MSP/PSP 与浮点状态。

### 临界区与硬实时中断

- **关中断**用 `PRIMASK`（全关，仅 M 核）或 `basepri`（按优先级屏蔽）；`vTaskSuspendAll` 是**挂起调度器**（不关中断，空闲任务处理）。
- **`configMAX_SYSCALL_INTERRUPT_PRIORITY`**：大于该优先级的中断**不被临界区屏蔽**，用于硬实时/安全中断（确保它们随时可响应）。

### 常见追问

- 为什么用 PendSV 而不用普通中断做切换？——PendSV 最低优先，不打断 ISR，只在任务态切换。
- 为什么 Cortex-M 移植省事？——异常**硬件自动压栈**，少写很多现场保存代码。
- 临界区怎么开？——`taskENTER_CRITICAL`（关中断/提 basepri）或 `vTaskSuspendAll`（挂起调度）。
- 为什么有的中断不被临界区屏蔽？——`configMAX_SYSCALL_INTERRUPT_PRIORITY` 之上是硬实时中断，需始终响应。

> 📌 一句话记忆：**FreeRTOS 移植 = SysTick(tick) + PendSV(上下文切换,最低优先级不打断ISR) + SVC(首启动) + 临界区(PRIMASK/basepri 或 挂起调度)；Cortex-M 硬件自动压栈帮了大忙；configMAX_SYSCALL_INTERRUPT_PRIORITY 之上是硬实时中断。**
