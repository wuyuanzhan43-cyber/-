---
title: RTOS 任务间通信：队列/事件组/任务通知
id: task-comm
category: os
difficulty: 3
tags: [RTOS, 任务通信, 消息队列]
company: [华为, 大疆, 智驾]
keywords: 消息队列 事件组 任务通知 信号量 生产者消费者 同步
answer: |
  任务间通信（IPC）常用几种原语：
  - **消息队列（Queue）**：传递**数据**（拷贝消息），生产者-消费者模式，可阻塞/超时；适合传结构体、字节流、任务间数据交换。
  - **事件组（Event Group）**：一组**标志位**，任务可等待“某个/多个事件”发生（与/或逻辑）；适合“多个条件齐备才执行”。
  - **信号量（Semaphore）**：**计数/同步**，生产者 give、消费者 take，控制“资源数量”或“事件发生次数”。
  - **互斥锁（Mutex）**：**互斥**，保护共享资源，带优先级继承。
  - **任务通知（Task Notification）**：轻量，直接给某个任务发通知（一个 32 位通知值），比队列更快、更省内存，但**每个任务只有一个通知值**，且不能异步传递到非指定任务。
  RTOS（FreeRTOS 等）：`xQueueSend/Receive`、`xEventGroupSetBits/WaitBits`、`xTaskNotify/NotifyWait`、`xSemaphoreGive/Take`；**中断里只能用 `FromISR` 版本**。
why: |
  任务是独立的执行流，无法直接靠“共享全局变量”可靠同步（有竞争），需要 IPC 来**同步**与**交换数据**。
  选型看需求：**传数据 → 队列；等/多事件 → 事件组；计数/资源 → 信号量；保护共享资源 → 互斥锁；低延迟单播通知 → 任务通知**。
  队列有拷贝开销与内存（队列深度×消息大小），事件组/通知更轻。中断里发通知/给信号量可以，但**不能阻塞等待**。
---
<FlashCard />

## 深读

### IPC 原语对照

| 原语 | 传数据？ | 语义 | 阻塞？ | 典型场景 |
|---|---|---|---|---|
| 消息队列 | ✅ | 数据传递 | 可阻塞/超时 | 生产-消费、传结构体 |
| 事件组 | ❌ | 标志/多事件 | 可阻塞 | 多条件齐备 |
| 信号量 | ❌ | 计数/同步 | 可阻塞 | 资源数量、事件计数 |
| 互斥锁 | ❌ | 互斥保护 | 可阻塞 | 保护临界区 |
| 任务通知 | ❌ | 单播通知(1个值) | 可阻塞 | 轻量、低延迟通知 |

### 生产者-消费者（队列）

```
生产者任务: 采集数据 -> xQueueSend(q, &data, timeout)
             ...            ...
消费者任务: xQueueReceive(q, &data, timeout) -> 处理
```

- 队列会**拷贝**消息，注意消息大小与队列深度（内存预算）。
- 可阻塞/超时平衡实时性。

### 事件组

- 用位表示“某事件发生”，`xEventGroupSetBits` 置位、`xEventGroupWaitBits` 等待若干位置位（`AND`/`OR`）。
- 适合“等传感器、电源、按钮等多个条件都好了再动作”。

### 任务通知（轻量）

- 直接给指定任务发一个 32 位值/标志，无需队列、无需共享内存，**开销最小**。
- 局限：**每个任务只有一个通知值**；若同时多个来源发通知会覆盖；不能像队列那样存多份。

### 中断里的限制（高频追问）

中断上下文**不能阻塞**，所以：

- 用 **`FromISR` 版本**：`xSemaphoreGiveFromISR`、`xQueueSendFromISR`、`xEventGroupSetBitsFromISR`、`xTaskNotifyFromISR`。
- 中断里**可以 give / 发队列 / 发通知**（唤醒任务），但**不能 take 阻塞**。
- 若中断里触发了调度，要用 `portYIELD_FROM_ISR`/`xHigherPriorityTaskWoken` 让出。

### 常见追问

- 为什么要 IPC 而非共享全局变量？——共享变量需锁，且无法体现“数据流/事件”语义；IPC 自带同步与缓冲。
- 队列和事件组选哪个？——要传数据用队列；只要“标志/多事件”用事件组，更轻。
- 任务通知能代替队列吗？——轻量单播可以部分代替，但多份数据/多来源要队列。

### ★ 参考题解精华

> 摘自 FreeRTOS 内核面试题集（V11.1.0 源码），补充「事件组 / 任务通知」的源码级落地细节与选型。（队列内部结构见「FreeRTOS 队列与内存管理 q-freertos-memory」。）

**① 事件组：只有低 24 位可用；唤醒“所有满足者”而非最高优**

- `EventGroup_t` = `uxEventBits`（各 bit 值）+ `xTasksWaitingForBits`（等待链）；`EventBits_t` 最高 **8 位被内核保留**（`0xFF000000`），用户实际只有 **24 个事件位**。
- 高 8 位在任务阻塞时被塞进 `xEventListItem.xItemValue`：bit24=`WAIT_FOR_ALL_BITS`（AND/OR）、bit25=`CLEAR_ON_EXIT`（唤醒时是否自动清 bit）、bit26=`UNBLOCK_DUE_TO_BIT_SET`（为什么醒来：bit 匹配 or 超时）。
- AND/OR 由 `xWaitForAllBits` 区分：`(cur & wait)==wait`（AND，全部满足） vs `(cur & wait)!=0`（OR，任一满足）。
- **等待链用 `vTaskPlaceOnUnorderedEventList` 不排序**：因为 `SetBits` 会**唤醒所有条件满足的任务**（不论优先级），逐个遍历判断；而队列 `xQueueSend` 只唤醒**一个**最高优等待者，所以队列的等链才按优先级排序。
- `xEventGroupSync` = SetBits + WaitBits 的原子组合，实现多任务**栅栏/会合点**；超时返回时返回值**不含** `UNBLOCK_DUE_TO_BIT_SET` → 调用者知道同步失败。
- `xEventGroupSetBitsFromISR` **不在 ISR 里直接操作链表**，而是经 `xTimerPendFunctionCallFromISR` 借道 **Timer Daemon Task** 在任务上下文里执行“遍历+摘链+入就绪”这些重活。
> 💡 一句话：**事件组=低 24 位的多事件标志；等链不排序（一次唤醒所有满足者）；ISR 里设位走 Timer Daemon，ISR 只标记意图。**

**② 任务通知：零拷贝、轻量，但单播**

- **快在哪**：队列 Send 要两次 `memcpy`（发送者→队列存储→接收者），任务通知直接写目标 TCB 的 `ulNotifiedValue`——**零拷贝、零中间存储**；且每任务创建时自带通知，无 Queue_t（约 84 字节 + 缓冲）的开销，每通知槽只 4 字节。

| `eNotifyAction` | 效果 | 代替什么 |
|---|---|---|
| `eNoAction` | 只唤醒 | 二值信号量 |
| `eSetBits` | `\|=` | 事件组 |
| `eIncrement` | `++` | 计数信号量 |
| `eSetValueWithOverwrite` | `=` 覆盖 | 发最新数据（旧值覆盖） |
| `eSetValueWithoutOverwrite` | 仅“未被读”时写 | 保证不丢（上次没消费本次丢弃） |

- `ulTaskNotifyTake` = **计数语义**（每 Take 递减/清零，配 `xTaskNotifyGive` → `eIncrement`）；`xTaskNotifyWait` = **值/bit 语义**（按 bit mask 清零，配 `xTaskNotify` 任意动作）。
- `xTaskNotify`（任务上下文）内部传 `NULL`；`xTaskNotifyFromISR` 传 `pxHigherPriorityTaskWoken`——ISR 内不能立刻 `taskYIELD`，唤醒更高优就置位，`portEND_SWITCHING_ISR(pxHigherPriorityTaskWoken)` 在 ISR 结束后再触发 PendSV。
- **局限（何时必须用队列）**：单播（只能发给指定任务）、无广播、无数据缓冲（只有 32 位）、**发送者永不阻塞（无法反压）**。多对一、一对多广播、需流控反压、要传 >32 位/结构体 → 都得用队列。
> 💡 一句话：**通知=直接写 TCB + 零拷贝 + 轻量单播，适合一对一轻量信号；要搬数据/广播/反压就用队列。**

**③ 选型金句**：传数据→队列；多事件→事件组；计数/同步→信号量；护资源→互斥锁；轻量单播→任务通知。通知做不了就自问“要不要广播/缓冲/反压”，要就回队列。

> 📌 一句话记忆：**传数据→队列；多事件→事件组；计数/同步→信号量；护共享资源→互斥锁；低延迟单播→任务通知；中断里只能 give/发，不能阻塞。**
