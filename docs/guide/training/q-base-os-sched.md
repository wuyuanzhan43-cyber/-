---
title: 底子·RTOS 任务五状态与调度机制
id: base-os-sched
category: training
difficulty: 4
tags: [底子, RTOS, 调度, 状态]
company: [智驾, 大疆]
keywords: 调度 优先级 抢占 时间片 任务状态 就绪队列
answer: |
  **任务五状态**：**运行（Running）/ 就绪（Ready）/ 阻塞（Blocked，等事件或延时）/ 挂起（Suspended）/ 终止（Deleted）**。
  - **Running**：**不在任何链**上，用 `pxCurrentTCB` 全局指针直接引用（当前只有一个）。
  - **Ready**：挂到**按优先级的就绪链表** `pxReadyTasksLists[priority]`。
  - **Blocked**：挂到**延时列表**（等超时）+ **事件等待链**（等信号量/队列）。
  - 调度器只调度**就绪**任务。

  **调度机制（FreeRTOS 总纲）**：**固定优先级抢占 + 同优先级时间片轮转**，一句话：**始终选最高优先级就绪列表中的下一个任务运行**。
  - **抢占**：高优先级任务**进入就绪**（如中断里 give 唤醒）→ 立即抢占当前。
  - **时间片**：同优先级任务**轮流**，各跑一个时间片（`configUSE_TIME_SLICING`）。
  - **阻塞让出 CPU**：任务等事件/延时 → 让出，不空转。

  **为什么 O(1)**：`uxTopReadyPriority` 是**位图**（bit N=1 表示优先级 N 有就绪任务），配合 **CLZ（前导零）** 一条指令 O(1) 找到最高就绪优先级，不用挨个扫。
why: |
  RTOS 的核心是「**选谁跑、何时切**」。能说清**五状态 + 就绪链表按优先级组织 + 抢占/时间片/阻塞**，就理解了调度器；再加「**位图+CLZ 实现 O(1) 选最高优先**」，就从「会用」到「懂源码」。这是嵌入式 OS 的最高频考点。
---
<FlashCard />

## 深读

### 五状态与链表
| 状态 | 挂哪条链 |
|---|---|
| Running | 不在链（`pxCurrentTCB`） |
| Ready | `pxReadyTasksLists[priority]` |
| Blocked | 延时列表 + 事件等待链 |
| Suspended | `xSuspendedTaskList` |
| Deleted | `xTasksWaitingTermination` |

### 调度热路径
```
uxTopReadyPriority 位图 → CLZ 找最高就绪优先级 → pxReadyTasksLists[prio] 取头
```
- O(1)，与任务数无关。

### 常见追问
- 为什么高优先级不执行？——低优先级/中断占 CPU、优先级反转、任务被阻塞。
- 时间片干嘛用？——同优先级轮流，避免独占。
- 怎么让出 CPU？——`taskYIELD` 或进入阻塞（延时/等事件）。

> 📌 一句话：**RTOS = 固定优先级抢占 + 时间片轮转，选最高优先级就绪任务；位图+CLZ 实现 O(1)；阻塞让出 CPU。**
