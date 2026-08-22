---
title: FreeRTOS 队列源码（环形缓冲与阻塞）
id: freertos-queue-src
category: os
difficulty: 5
tags: [FreeRTOS, 队列, 源码]
company: [智驾, 联发科]
keywords: FreeRTOS 队列 Queue_t 环形缓冲 阻塞 信号量 互斥锁
answer: |
  FreeRTOS 的**信号量、互斥锁、队列其实是同一套 `Queue_t` 结构**（“用信号量还是互斥锁”只是用不同的语义调用同一份底层）。

  **环形缓冲**：队列内核是一段**环形缓冲**：
  - `pcHead` 缓冲起点、`pcWriteTo`/`pcReadFrom` 读写指针、`uxMessagesWaiting`/`uxLength`/`uxItemSize`。
  - **入队** `xQueueGenericSend`：把消息**拷贝**到 `pcWriteTo`（按 `uxItemSize`）；**出队**从 `pcReadFrom` 读。`pcReadFrom` 在 `pcWriteTo` 之前（读端追写端），**支持 `SEND_TO_FRONT`**——往“读”端前面插，从而实现优先级/紧急投递。
  - 满/空靠 `uxMessagesWaiting` 与 `uxLength` 判断。

  **阻塞/超时**：拿不到锁/队列满空时，任务把**自己的 `xEventListItem` 挂到队列的等待链**，并按优先级排序；超时则挂到延时列表。等待链**不排序**（唤醒时一次唤醒所有满足者）。被唤醒后从就绪链恢复。

  **信号量/互斥锁复用 Queue_t**：
  - **信号量** = `uxItemSize=0` + `pcHead=NULL`（不存数据只计数）。
  - **互斥锁** = `uxItemSize=0` + `pcHead=NULL` + `xMutexHolder`/`uxRecursiveCallCount`，实现**所有权 + 优先级继承**。
  - **队列锁** `cRxLock`/`cTxLock`：**-1 表示未锁**，0~127 兼作“锁内入/出队计数”（ISR 里借锁，退出时统一处理）。

  **ISR 版**：`FromISR` 调用中若唤醒了更高优先级任务，通过 `pxHigherPriorityTaskWoken` 置位，返回后触发调度。
why: |
  “**为什么队列传数据要拷贝**”“**为什么能 SEND_TO_FRONT**”“**为什么信号量/互斥锁/队列是同一套**”“**为什么 ISR 里要 pxHigherPriorityTaskWoken、队列锁用 -1**”——都要看源码：
  一条环形缓冲 + 一个等待事件链，就同时实现 队列(传值)、信号量(计数)、互斥锁(所有权+继承)，而且用**“读端在前面”**的不对称设计天然支持前端插入；`-1` 作未锁标记是**ISR 与任务共用锁**的技巧。
---
<FlashCard />

## 深读

### Queue_t 结构（环形缓冲）

```c
typedef struct QueueDefinition {
  int8_t *pcHead;       // 缓冲起点
  int8_t *pcWriteTo;    // 写指针
  int8_t *pcReadFrom;   // 读指针
  UBaseType_t uxMessagesWaiting;
  UBaseType_t uxLength;
  UBaseType_t uxItemSize;
  List_t xTasksWaitingToSend;    // 等“能发”的任务
  List_t xTasksWaitingToReceive; // 等“能收”的任务
  ...
} Queue_t;
```

- 入队拷到 `pcWriteTo`，出队从 `pcReadFrom`；**读端在写端之前** → 支持 `SEND_TO_FRONT`（往前插入）。
- 满/空看 `uxMessagesWaiting` 与 `uxLength`。

### 阻塞与唤醒

- 拿不到资源 → 任务 `xEventListItem` 挂到队列等待链（按优先级排序）；超时挂延时列表。
- 等待链**不排序**（唤醒时一次唤醒所有满足者，靠就绪链再排序）。
- 被唤醒后从就绪链取回，重新调度。

### 一套 Queue_t 造出三种语义

| 对象 | uxItemSize | pcHead | 额外字段 | 语义 |
|---|---|---|---|---|
| 队列 | >0 | 缓冲 | — | 拷贝传值 |
| 信号量 | 0 | NULL | — | 计数 |
| 互斥锁 | 0 | NULL | xMutexHolder/uxRecursiveCallCount | 所有权+继承 |

- 互斥锁的 `xMutexHolder` 记录持有者，`uxRecursiveCallCount` 支持递归；优先级继承靠 `xTaskPriorityInherit/Disinherit`。

### 队列锁（ISR 与任务共用）

- `cRxLock`/`cTxLock`：**-1 = 未锁**；0~127 = 在锁内的入/出队计数值。
- ISR 里往锁内入队=只记账，**退出中断时统一处理**（否则在中断里操作会破坏队列一致性）。

### 常见追问

- 队列为什么拷贝？——`uxItemSize>0`，按值拷贝，保证数据独立。
- 为什么能 SEND_TO_FRONT？——读端在写端之前，把消息插到读端前面。
- 为什么信号量和互斥锁用同一套？——同样的“事件链 + 计数/所有权”语义，复用 Queue_t。
- 为什么 ISR 要 pxHigherPriorityTaskWoken？——ISR 里唤醒了更高优先级任务，返回后需触发调度。

> 📌 一句话记忆：**FreeRTOS 队列=环形缓冲(读端在前)+等待事件链；信号量/互斥锁/队列共用 Queue_t；队列锁 cRxLock/cTxLock 用 -1 作未锁、0~127 计数，ISR 里只是记账、退出统一处理。**
