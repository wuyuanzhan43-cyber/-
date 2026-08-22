---
title: FreeRTOS 队列与内存管理
id: freertos-memory
category: os
difficulty: 4
tags: [RTOS, FreeRTOS, 队列, 内存]
company: [智驾, 大疆, 联发科]
keywords: FreeRTOS 队列 动态分配 heap_1 heap_4 静态分配 任务栈 内存管理
answer: |
  **FreeRTOS 队列**：任务间**传数据/同步**的核心。
  - `xQueueCreate(len, itemSize)`：创建，内部**从 FreeRTOS 堆分配**；`len`=消息数、`itemSize`=每条消息字节。
  - `xQueueSend`入队、`xQueueReceive`出队（可**阻塞/超时**）。
  - 队列会**拷贝**消息（itemSize 大小），所以消息别太大、要预算 `len*itemSize` 内存。
  - `xQueueCreateStatic`：用**静态缓冲**（不占堆）。
  **FreeRTOS 内存管理**：
  - `heap_1.c`：只分配不释放（简单）。
  - `heap_2.c`：可释放，**不合并碎片**。
  - `heap_3.c`：包装标准 malloc/free。
  - `heap_4.c`：可释放 + **合并相邻碎片**（推荐）。
  - `heap_5.c`：多内存区（多个不相邻内存块）。
  - `configTOTAL_HEAP_SIZE`：配置堆大小。
  **任务栈**：每个任务**独立栈**（`xTaskCreate` 指定大小），也是内存，要预算（含中断/嵌套/局部大变量）。
why: |
  FreeRTOS 里**队列是任务通信+同步的核心**，但也**消耗内存**（堆）。队列深度、消息大小、任务栈、堆策略直接决定**内存是否足够、是否有碎片、是否稳定**。
  - 选 `heap_4`（合并碎片）或**静态分配**（不依赖堆、可预测）适合**长期稳定**。
  - `heap_1` 无释放、`heap_2` 有碎片——实时/长跑选 `heap_4`/静态。
  - 内存不足会导致**分配失败**（创建队列/任务失败），所以要做**内存预算**。
---
<FlashCard />

> 📖 队列的创建/拷贝/阻塞/FromISR 见「RTOS 任务通信（q-task-comm）」。

## 深读

### 队列用法（核心）

```c
QueueHandle_t q = xQueueCreate(8, sizeof(uint32_t)); // 8 个 uint32 消息
xQueueSend(q, &val, portMAX_DELAY);   // 入队(可阻塞/超时)
xQueueReceive(q, &val, timeout);      // 出队
```

- **拷贝**：消息按 itemSize 拷贝进队列，**传递的是值**，不是指针（除非传指针）。
- **阻塞**：满/空时可阻塞（`xQueueSend` 满可等，`xQueueReceive` 空可等），并配合 `FromISR` 版本在中断里用。

### FreeRTOS 堆实现（heap_x）

| 实现 | 特性 | 适用 |
|---|---|---|
| heap_1 | 只分配、不释放 | 简单、固定 |
| heap_2 | 可释放、无合并 | 较少释放 |
| heap_3 | 封装 malloc/free | 依赖标准库 |
| heap_4 | 可释放+合并 | **推荐**、抗碎片 |
| heap_5 | 多内存区 | 多个不相邻 RAM |

- `configTOTAL_HEAP_SIZE` 定义堆总大小；`xPortGetFreeHeapSize()` 查剩余。

### 静态 vs 动态

- **动态**：`xTaskCreate`/`xQueueCreate`（从 FreeRTOS 堆分配）。
- **静态**：`xTaskCreateStatic`/`xQueueCreateStatic`（用你提供的缓冲，**不占堆**），内存可预测、无堆碎片，适合**安全/确定**场景。

### 任务栈预算

- 每任务独立栈，`xTaskCreate(..., stackDepth, ...)`；栈太小会**栈溢出**（可用 `configCHECK_FOR_STACK_OVERFLOW` 检测）。
- 栈要含：局部变量、调用深度、中断/嵌套（若中断用该栈）余量。

### 常见追问

- 队列传的是值还是指针？——按 itemSize **拷贝值**；传大数据用指针（注意生命周期）。
- 为什么推荐 heap_4？——可释放且**合并碎片**，长期运行更稳。
- 静态分配优点？——无堆、内存可预测、无碎片，适合安全/确定。
- 内存不够会怎样？——创建队列/任务**失败**（返回 NULL/错误）。
- 队列满/空怎么办？——可阻塞/超时；中断里用 FromISR 版（不能阻塞）。

### ★ 参考题解精华

> 摘自 FreeRTOS 内核面试题集 + 内存管理源码笔记（V11.1.0），补充「heap_2 vs heap_4、Queue_t 一箭三雕、队列锁」的源码级细节。

**① 为什么 FreeRTOS 自己管内存，不用标准 `malloc/free`**

1. **线程安全**：标准库分配器通常不可重入，多任务/中断并发调用要包装。
2. **确定性**：标准库执行时间取决于碎片状态，实时系统要求可预测。
3. **可移植性**：标准库依赖链接器 `.heap` 段，很多嵌入式工具链支持有限。
4. **可观测性**：标准库内部不透明；FreeRTOS 提供 `xPortGetFreeHeapSize()`、`xMinimumEverFreeBytesRemaining`（历史最低）、`vPortGetHeapStats()`。

（`heap_3` 就是给 `malloc/free` 套一层 `vTaskSuspendAll` 保护，用于有完整标准库的平台。）

**② heap_2 vs heap_4 的根本差异：排序方式决定“能不能合并”**

| | heap_2 | heap_4 |
|---|---|---|
| 空闲链表排序 | 按 `xBlockSize` **大小** | 按 **内存地址** |
| 分配策略 | 最佳适配 best-fit | 首次适配 first-fit |
| 释放时合并相邻 | **否**（外部碎片累积） | **是** |

- **根本原因**：要判断两块物理相邻，需比较地址 `(A地址 + A大小) == B地址`。**按地址排序**保证物理相邻的空闲块在链表中一定是**前驱/后继**，可直接检查合并；heap_2 按大小排序，物理相邻块在链表中可能隔很远，找不到邻居 → 无法合并。
- **运行期“建了又删”必须 `heap_4`（推荐）**；`heap_1`（只分配不释放）适合“启动时建好、永不删”。
> 💡 一句话：**heap_4 按地址排才能找到物理邻居做合并；heap_2 按大小排做 best-fit 却合并不了 → 碎片。长期跑/动态增删选 heap_4 或静态分配。**

**③ `Queue_t` 一套结构同时实现 队列 / 信号量 / 互斥锁**

| 字段 | 数据队列 | 信号量 | 互斥锁 |
|---|---|---|---|
| `uxItemSize` | >0（拷贝数据） | 0（不拷贝） | 0 |
| `pcHead` | 指向真实缓冲区 | 指向 Queue_t 自身 | `NULL`（作类型标记） |
| `uxMessagesWaiting` | 队列 item 数 | 可用资源计数 | 1=开 0=锁 |

- `uxItemSize == 0` 时 `prvCopyDataToQueue/FromQueue` 跳过 `memcpy`，只操作计数器；互斥锁用 `pcHead==NULL` + union 里的 `xMutexHolder`、`uxRecursiveCallCount` 管理持有者与优先级继承（递归锁计数即递归深度）。

**④ `pcWriteTo` / `pcReadFrom` 为什么不对称**

| 指针 | 拥有者 | 语义 |
|---|---|---|
| `pcWriteTo` | 生产者 | “先写后推”——写到当前再推进 |
| `pcReadFrom` | 消费者 | “先推后读”——先推进到下一个再读 |

- 不对称让 **队首插入（`SEND_TO_FRONT`）** 成为可能：把数据写到已消费的 `pcReadFrom` 位置再回退一格，等于在读游标前插入一项；若两边都“先操作后推进”，队首插入还需额外记录“上次读位置”。

**⑤ 队列锁 `cRxLock`/`cTxLock`：`-1` 作“未锁”，0~127 兼作计数器**

- 解决的竞态：任务准备阻塞时“检查队列状态 → 挂入等待链”，若中间被 ISR 打断，ISR 看等待链时任务还没挂上 → **错过唤醒**。
- 机制：任务阻塞前 `prvLockQueue` 把锁从 `-1`→`0`；ISR 里操作队列若发现锁不为 `-1`，不直接改事件链，**只递增计数**；任务挂好后 `prvUnlockQueue` 按计数**补发唤醒**。
- `-1` 的妙处：若 `0` 表示未锁，还得额外 flag 区分“没锁”与“锁了但没事发生”；用 `-1` 后 `0` 表示“锁了但 ISR 还没动”，`N` 表示“锁期间 ISR 操作了 N 次”——**一个字段同时当 flag + counter**。

> 📌 一句话记忆：**队列=传值+同步（len×itemSize 耗堆）；FreeRTOS 堆选 heap_4(合并)或静态分配；任务栈要预算，内存不足则分配失败。**
