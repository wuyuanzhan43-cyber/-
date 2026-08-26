---
title: PendSV 异常在 FreeRTOS 中的作用
id: pendsv
category: rtos
difficulty: 4
tags: [RTOS, Cortex-M, PendSV, 上下文切换, SVC]
company: [智驾, 大疆, 联发科]
keywords: PendSV SVC 上下文切换 可挂起 最低优先级 PENDSVSET ICSR 调度 两阶段
answer: |
  **PendSV 是 Cortex-M 上一个"可挂起的系统服务异常"，FreeRTOS 用它执行任务上下文切换。** 一句话：**它是"真正切换任务"的载体，靠"优先级最低 + 可挂起"把"该不该切"和"什么时候切"解耦。**

  关键特性：
  1. **优先级最低**：可设成比任何中断都低，因此**不可能抢占正在运行的 ISR**。中断里若触发切换，只会**挂起（pend）PendSV**，等所有 ISR 处理完、回到任务态才真正切换——**确保不在中断上下文里切换任务**。
  2. **可挂起**：通过置位 **`SCB->ICSR.PENDSVSET`** 挂起，**无需立即执行**，适合做"软调度请求点"；也可读 `PENDSVACT` 看是否在挂起/活动态。
  3. **切换实现**：在 `vPortPendSVHandler` 里——保存当前任务 `R4–R11`、更新 `pxCurrentTCB`、调 `vTaskSwitchContext()` 选新任务、恢复新任务寄存器、`BX LR`（EXC_RETURN）返回。

  触发来源：`portYIELD()`（任务态主动让出）、`portYIELD_FROM_ISR()`（中断里请求切换）、SysTick 中断里判定"时间片到/延时常量到期"后挂起 PendSV。配套的 **SVC** 负责**启动第一个任务**（首次调度）。

  ### 一句话
  **PendSV = 最低优先级、可挂起的系统服务异常，是 FreeRTOS 真正执行上下文切换的地方；中断里只"挂起(PENDSVSET)"不立即切，等所有 ISR 结束回任务态才切；SVC 负责启动第一个任务。**
why: |
  为什么不用普通中断做切换？因为普通中断可能**抢占另一个正在执行的 ISR**，等于"在中断上下文里切任务"，违反"中断里不能调度"的纪律，破坏现场、引发不可预期错误。
  PendSV 用**最低优先级**保证：它总是在**所有高优先级 ISR 结束后（回到任务态）**才执行，从而：
  - **中断里只做"标记挂起"**（`PENDSVSET`），不在中断里切。
  - **切换动作被延迟到安全时刻**（CPU 空下来），不打断实时 ISR。
  所以 FreeRTOS 的"上下文切换"其实是"**内核决定切（记账 + 挂起 PendSV）→ 等安全时刻 → PendSV 里真的切（压/弹寄存器）**"，这是"**两阶段切换**"。PendSV 就是第二阶段的执行者。
---
<FlashCard />

## 深读

### PendSV vs SVC vs SysTick 的分工

| 异常 | 优先级 | 作用 |
|---|---|---|
| **SysTick** | 可配置（常为中等） | tick 时基：周期触发，驱动延时/超时/时间片判断，可挂起 PendSV |
| **PendSV** | 最低 | **任务上下文切换**的实际执行者 |
| **SVC** | 固定较高 | **启动第一个任务**（首次调用调度器时触发） |

### 触发路径（何时挂起 PendSV）

```
[任务态]  调 vTaskDelay/阻塞/挂起/portYIELD()
            → 内核把任务挪到目标链表(记账)
            → 置位 SCB->ICSR.PENDSVSET(请求切换)

[中断态]  SysTick 中断到期 / 某 FromISR 唤醒高优先级任务
            → portYIELD_FROM_ISR() 置位 PENDSVSET(只标记)
            → 等当前 ISR 结束、回到任务态才真正切换

[安全时刻] 所有更高优先级中断处理完 → PendSV 进入
            → vPortPendSVHandler: 保存现场→选新任务→恢复现场→返回
```

### 寄存器/源码级：PendSV 的挂起与配置

- **`SCB->ICSR`**：
  - `PENDSVSET`（bit28）：写 1 **挂起** PendSV；写 0 清除。
  - `PENDSVCLR`（bit27）：写 1 **清除**挂起。
  - `PENDSVACT`（bit10）：读，PendSV 是否**执行中**。
- **配置优先级**：`NVIC_SetPriority(PendSV_IRQn, 0xFF)`（设最低），SysTick 优先级常设为 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 同一级或更低。
- **临界区保护**：切换期间不希望被更高中断打断，用 `BASEPRI` 提权/关中断；PendSV 本身最低优先级，天然不会被"更高优先级 PendSV"嵌套。

### 源码：`portYIELD_FROM_ISR` 只做"标记"

```c
#define portYIELD_FROM_ISR(x)  do { if((x)!=pdFALSE) portSET_INTERRUPT_MASK_FROM_ISR(); \
                                     portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT; } while(0)
// = SCB->ICSR |= PENDSVSET → 挂起 PendSV, 不立即切
```
- `x` 是"是否唤醒了更高优先级任务"（`xTaskNotifyFromISR` 等的返回值），非 pdFALSE 才挂起，避免无谓切换。

### 工程场景

- **症状**：高优先级硬实时中断打断任务切换，导致切到一半、现场错乱；或任务切换延迟明显。
- **根因**：PendSV 优先级没设**最低**，或 SysTick/相关中断优先级配错，导致 PendSV 抢在实时 ISR 前执行。
- **对策**：把 PendSV 设为 `0xFF`（最低），SysTick 按 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 配置；切任务只挂起 PendSV，别在 ISR 里直接调切换。

### 进阶追问链

1. **Q：为什么 FreeRTOS 不直接调切换函数，而要挂起一个异常？** → 直接用函数切换会被更高级中断打断、也可能在中断里执行。挂起 PendSV 把切换**延迟到安全时刻**（无更高中断、处于任务态），且保存/恢复寄存器是**架构相关**操作，放异常（汇编）里最干净。
2. **Q：SVC 和 PendSV 怎么配合？** → SVC 在**首次调度**（`vTaskStartScheduler` 触发 SVC）把首个任务现场准备好并启动；PendSV 负责后续所有**任务间切换**。
3. **Q：`portYIELD_FROM_ISR` 的返回值是什么？** → 由 `*FromISR` API 给出"是否唤醒了更高优先级任务"（`pdTRUE`/`pdFALSE`），据此决定要不要挂起 PendSV（减少无效切换）。
4. **Q：如果没有 PendSV 会怎样？** → 切换要么在中断里做（违反纪律、易崩），要么延迟到调度器手动调用（无法高效响应"中断唤醒高优先级任务"）。PendSV 让"中断里请求切换"变成低开销的"记一笔、稍后切"。

> 📌 一句话记忆：**PendSV＝优先级最低、可挂起的系统服务异常，是 FreeRTOS 真正执行上下文切换的地方；中断里只挂起(SCB->ICSR.PENDSVSET)不立即切，等所有 ISR 结束回任务态才切——把"该切"与"何时切"解耦；SVC 负责启动第一个任务。**
