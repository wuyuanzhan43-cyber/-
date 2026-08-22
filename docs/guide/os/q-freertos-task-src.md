---
title: FreeRTOS 任务管理与调度源码
id: freertos-task-src
category: os
difficulty: 5
tags: [FreeRTOS, 调度, 源码]
company: [智驾, 大疆]
keywords: FreeRTOS 调度 TCB 位图 O(1) 延时列表 链表
answer: |
  FreeRTOS 调度总纲 = **固定优先级抢占 + 同优先级时间片轮转**，可用一句话概括：**始终选最高优先级就绪列表中的下一个任务运行**。

  核心实现细节：
  - **TCB（任务控制块）**：每个任务的完整描述。**`pxTopOfStack` 必须是第一个成员**——因为移植层的上下文切换汇编直接 `LDR R0,[R1]` 读栈顶，不做偏移。
  - **两个 ListItem_t**：`xStateListItem`（挂在就绪/延时/挂起/终止列表，决定**调度状态**）+ `xEventListItem`（挂在队列/事件组等待列表，表示**在等什么**）。事件节点的值 = **反序优先级**（`configMAX_PRIORITIES - uxPriority`），保证高优先级任务先被唤醒。
  - **O(1) 找最高优先**：`uxTopReadyPriority` 是个**位图**（bit N=1 表示优先级 N 有就绪任务），配合 **CLZ（前导零）** 一条指令选出最高就绪优先级；`pxReadyTasksLists[]` 是“优先级为下标的就绪链表数组”，同优先级任务按轮转顺序排列。
  - **延时/超时**：`xTickCount`（32 位会回绕）+ **两个延时列表**（回绕时交换指针，不搬节点）+ `xNextTaskUnblockTime`（未到期则跳过扫描，优化）。
  - **生命周期**：`vTaskDelete(self)` 先把 TCB 放入 `xTasksWaitingTermination`，由 **Idle 任务**回收（不能在自己上下文释放自己）。
  - **`pxCurrentTCB`** 直接引用当前任务（不在任何链表上）。
why: |
  答“**为什么调度是 O(1)**”“**为什么 TCB 第一个成员是栈顶**”“**任务状态到底怎么表示**”，只能到源码层说清：
  位图+CLZ 让“选最高优先”常数时间；`pxTopOfStack` 放首字节是**移植层汇编的硬约定**；两个链表节点是**“调度状态”与“等待事件”分离**的设计（等待事件的唤醒依赖优先级序，而不依赖调度状态）。这是“会用 FreeRTOS”和“理解 FreeRTOS”的分水岭。
---
<FlashCard />

## 深读

### 调度三板斧（三个配置）

| 配置 | 作用 | 典型 |
|---|---|---|
| `configUSE_PREEMPTION` | 1=抢占式，0=协作式 | 1 |
| `configUSE_TIME_SLICING` | 1=同优先级时间片轮转 | 1 |
| `configMAX_PRIORITIES` | 优先级数量（0~N-1） | 5~32 |

- **固定优先级**：任务优先级运行期间不变（除非互斥锁继承），这与 Linux CFS/EDF 等动态调度本质区别。嵌入式语义由开发者给定，**O(1) 调度比公平性重要**。

### O(1) 选最高优先（位图 + CLZ）

```
uxTopReadyPriority 位图: bit3=1(优先级3就绪) ...
CLZ 找最高位 → O(1) 得最高就绪优先级
pxReadyTasksLists[prio] → 从该链取头
```

- 不用线性扫描每个优先级，常数时间。所以 FreeRTOS 调度开销与任务数**无关**。

### 任务控制块 TCB 关键字段

```c
typedef struct tskTaskControlBlock {
  volatile StackType_t *pxTopOfStack; // 必须第一个成员！
  ListItem_t xStateListItem;   // 状态链
  ListItem_t xEventListItem;   // 事件链
  UBaseType_t uxPriority;
  UBaseType_t uxBasePriority;  // 优先级继承用
  ...
} tskTCB;
```

- **`pxTopOfStack` 放首位**：移植汇编直接按 TCB 首地址读偏移 0，假设它即栈顶指针（`LDR R0,[R1]`）。
- 一个任务同一时刻只在**一个状态链 + 一个事件链**上（或不在事件链）。

### 延时列表与回绕

- `xTickCount` 32 位会从 `0xFFFFFFFF→0` 回绕；任务的唤醒时间可能跨回绕点。
- **双延时列表**（`xDelayedTaskList1/2`）交替承担“当前周期/溢出周期”，**回绕时交换指针即可，不搬节点**。
- `xNextTaskUnblockTime` 记住最早到期任务，未到期就跳过扫描（省遍历）。

### 常见追问

- 为什么调度是 O(1)？——`uxTopReadyPriority` 位图 + CLZ，常数时间找最高就绪优先。
- 为什么 TCB 第一个成员是栈顶？——移植层汇编直接按首地址读栈顶指针。
- 任务状态怎么表示？——TCB 里的 `xStateListItem` 挂在某状态链上。
- 删除自己怎么办？——`vTaskDelete(self)` 先入 `xTasksWaitingTermination`，Idle 任务回收。

> 📌 一句话记忆：**FreeRTOS = 固定优先级抢占 + 时间片轮转；位图(uxTopReadyPriority)+CLZ 实现 O(1) 选最高优先；TCB 的 pxTopOfStack 必须首位；xStateListItem/xEventListItem 分别表示“调度状态”与“等待事件”。**
