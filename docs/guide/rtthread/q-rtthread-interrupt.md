---
title: RT-Thread 中断管理与中断内 IPC
id: rtthread-interrupt
category: rtthread
difficulty: 4
tags: [RT-Thread, 中断, ISR, IPC, 中断嵌套]
company: [智驾, 大疆, 汇顶]
keywords: RT-Thread 中断管理 rt_interrupt_enter rt_interrupt_leave 中断嵌套 ISR 安全 IPC
answer: |
  RT-Thread 中断管理遵守与 FreeRTOS 相同的纪律：**中断里极短、不阻塞、不能调度线程，只做“读外设 + 标志/通知”，重活交给线程。** 差别在于 API 和中断进入/离开的处理方式。

  ### 中断生命周期
  - BSP 提供 `rt_hw_interrupt_disable()`/`rt_hw_interrupt_enable()`（保存和恢复中断状态，对应 Cortex-M 的 `PRIMASK`/`basepri`）。
  - **`rt_interrupt_enter()`/`rt_interrupt_leave()`**：进入/离开**中断**时调用，用来**维护中断嵌套计数 `rt_interrupt_nest`**，并让内核知道“当前处于中断上下文”。
  - `rt_hw_interrupt_install`/`rt_hw_interrupt_handle`：挂中断服务函数（BSP 层注册）。

  ### 中断嵌套
  - `rt_interrupt_nest` 记录嵌套层数；嵌套中断同样要**可重入**、保护共享数据。
  - 中断里**不能**调用会**阻塞/切线程**的 IPC（`rt_mutex_take`/`rt_sem_take`/`rt_mq_recv` 等）；只能调用**ISR 安全**的“通知/释放”型 API。

  ### 中断里可用与禁用
  | 可用（ISR 安全） | 禁用（会阻塞/切线程） |
  |---|---|
  | `rt_sem_release` | `rt_sem_take` |
  | `rt_mq_send` | `rt_mq_recv` |
  | `rt_mb_send` | `rt_mutex_take`/`rt_mutex_release` |
  | `rt_event_send` | `rt_thread_delay`、`rt_thread_suspend` 等 |

  ### 一段典型 ISR（唤醒线程）
  ```c
  void uart_isr(void) {
    rt_interrupt_enter();
    // 读外设、清标志 → 入环形缓冲/信箱 → 唤醒任务
    rt_mb_send(mb, (rt_ubase_t)&buf);   // 或 rt_sem_release(sem)
    if (need_sched) rt_schedule();       // 中断结束后可能触发调度(视配置)
    rt_interrupt_leave();
  }
  ```
why: |
  这题考“**RT-Thread 中断里能干什么、不能干什么**”，与 FreeRTOS 的 `FromISR` 原则一致，但 API 名字不同：
  - **为什么用 `rt_interrupt_enter/leave`**：让内核知道“正在中断上下文”，从而在 `rt_sem_release`/`rt_mq_send` 等唤醒线程后**不立即切**、而是**延迟到中断结束后**再触发调度（对应 FreeRTOS 的 PendSV 延迟切换机制）。
  - **为什么中断里不能 `take`/`recv`**：这些会**阻塞等待**，而中断没有“可阻塞的任务上下文”，会挂死/破坏现场。
  - **为什么中断里只“通知”**：中断是异步、高优先级、不可预测，耗时越久丢中断/破坏实时性越重（见 FreeRTOS 章节 Q8）。
---
<FlashCard />

## 深读

### 中断进入/离开与调度延迟

```
[中断] rt_hw_interrupt_disable → rt_interrupt_enter()
   → 读外设/清标志/置通知(rt_sem_release/rt_mq_send/rt_event_send)
   → (唤醒高优先级线程时) rt_schedule() 只“记一账”
   → rt_interrupt_leave() → 中断结束
   → 回到线程态 → 调度器才真正切到高优先级线程(类似 PendSV 延迟切换)
```

- `rt_interrupt_nest`：中断嵌套层数，>0 表示当前在中断上下文。
- 中断里唤醒高优先级线程，调度**延迟到中断返回到线程态**才执行——保证**不在中断里切线程**。

### 与 FreeRTOS 对照

| | FreeRTOS | RT-Thread |
|---|---|---|
| 中断里通知 | `xSemaphoreGiveFromISR` | `rt_sem_release` |
| 队列送 | `xQueueSendFromISR` | `rt_mq_send` |
| 阻塞版 | `xSemaphoreTake`(禁) | `rt_sem_take`(禁) |
| 中断关 | `portSET_INTERRUPT_MASK` | `rt_hw_interrupt_disable` |
| 延迟切换 | PendSV | 中断结束后调度 |

### 工程场景

- **症状**：中断里误用 `rt_sem_take`/`rt_mutex_take` → 断言/死机；或在中断里做重活丢数据。
- **根因/对策**：中断只用**释放/送**型 ISR 安全 API；重活（解析/打印/矩阵）放**线程**；用**DMA+环形缓冲**搬大数据，中断只通知；必要时 `rt_interrupt_leave` 后 `rt_schedule()` 触发调度。

### 进阶追问链

1. **Q：中断里为什么不能 `rt_sem_take`/`rt_mq_recv`？** → 这些会**阻塞等待**，而中断没有“可阻塞的任务上下文”，会挂死/破坏现场。只能调用“释放/发送”型 API（不阻塞、只唤醒）。
2. **Q：`rt_interrupt_enter/leave` 干什么？** → 维护**中断嵌套计数**、标识“当前在中断上下文”，使中断里唤醒线程后调度**延迟到中断结束**，保证不在中断里切线程。
3. **Q：中断嵌套要注意什么？** → 可重入、保护共享数据（关中断短临界区）；高优先级中断可打断当前 ISR；每层中断都要 `rt_interrupt_enter/leave`。
4. **Q：中断里唤醒高优先级线程会立刻切换吗？** → 不会。只**挂起调度请求**，等中断返回到线程态才切；这正是避免“中断里切换线程”的关键。

> 📌 一句话记忆：**RT-Thread 中断管理＝rt_interrupt_enter/leave 维护嵌套计数与“中断上下文”标识，调度延迟到中断结束；中断里只能用 ISR 安全 IPC(rt_sem_release/rt_mq_send/rt_mb_send/rt_event_send)，禁用 take/recv/block 版；和 FreeRTOS 的 FromISR 同理，只是 API 名不同；重活丢线程/DMA。**
