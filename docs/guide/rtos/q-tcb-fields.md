---
title: 任务控制块（TCB）里保存了哪些信息
id: tcb-fields
category: rtos
difficulty: 4
tags: [RTOS, TCB, 数据结构, FreeRTOS]
company: [智驾, 大疆, 联发科]
keywords: TCB pxTopOfStack xStateListItem xEventListItem uxPriority pxStack 优先级继承 任务通知
answer: |
  **TCB（任务控制块，`tskTCB`）是任务的全部"身份与状态"**，调度器靠它认任务。关键字段：
  - **`pxTopOfStack`**：指向任务栈上"**当前上下文帧**"的栈顶，**必须是 TCB 第 0 个成员**（移植层汇编直接按首地址读它，不做偏移）。
  - **`xStateListItem`**（`ListItem_t`）：**状态链节点**，挂在就绪/延时/挂起/终止链，决定"**能否被调度、何时唤醒**"。
  - **`xEventListItem`**（`ListItem_t`）：**事件链节点**，挂在队列/信号量/事件组等**等待链**，表示"**在等什么**"。
  - **`uxPriority`**：当前优先级；**`uxBasePriority`**：基底优先级（**优先级继承**时暂存用）。
  - **`pxStack`**：任务栈的**基址**（用于**栈溢出检测**）；`pxEndOfStack`（栈向下增长时的栈尾边界）。
  - **`pcTaskName`**：任务名字符串。
  - **`uxCriticalNesting`**：**临界区嵌套计数**（进入/退出临界区 +-1，[0]为不在临界区）。
  - **`ulNotifiedValue` / `ucNotifyState`**：**任务通知**的值与状态（`configUSE_TASK_NOTIFICATIONS` 时）。
  - **`uxMutexesHeld`**：当前持有的互斥锁数量（与优先级继承配套）。

  **核心思想**：TCB 里既有"**要恢复的 CPU 现场**"（经 `pxTopOfStack` 指向任务栈），又有"**调度元数据**"（两个链表节点、优先级、状态、通知、栈信息）。**调度状态与等待事件分离**——一个任务同一时刻在一张状态链 + 一张事件链上（或不在事件链）。
why: |
  TCB 是 FreeRTOS 的"**任务档案**"，理解它能解释很多设计：
  - **`pxTopOfStack` 放首位**：移植上下文切换汇编**直接按 TCB 首地址读栈顶**，所以必须放第一，这是硬约定。
  - **两个链表节点为何分开**：一个任务可能**同时等"超时（延时链）"又等"数据（事件链）"**——两条路径谁先到就从谁唤醒。若只有一个节点，就无法同时挂两条链。
  - **`pxStack` 与栈溢出检测**：用它作为任务栈基址，配合栈溢出钩子判断是否越界（引向 Q11/Q22）。
  - **`uxBasePriority`/`uxMutexesHeld`**：互斥锁的**优先级继承**依赖它们，锁释放时恢复到基底优先级。
---
<FlashCard />

## 深读

### TCB 源码结构（`tskTCB` 关键字段）

```c
typedef struct tskTaskControlBlock {
  volatile StackType_t *pxTopOfStack;  // 第 0 成员: 上下文帧栈顶
  #if (portUSING_MPU_WRAPPERS) xMPU_SETTINGS xMPUSettings; #endif
  ListItem_t xStateListItem;           // 状态链(调度状态)
  ListItem_t xEventListItem;           // 事件链(在等什么)
  UBaseType_t uxPriority;              // 当前优先级
  StackType_t *pxStack;                // 任务栈基址(溢出检测)
  char pcTaskName[configMAX_TASK_NAME_LEN];
  #if (portSTACK_GROWTH > 0) StackType_t *pxEndOfStack; #endif
  #if (portCRITICAL_NESTING_IN_TCB) UBaseType_t uxCriticalNesting; #endif
  #if (configUSE_MUTEXES) UBaseType_t uxBasePriority, uxMutexesHeld; #endif
  #if (configUSE_TASK_NOTIFICATIONS)
    volatile uint32_t ulNotifiedValue[configTASK_NOTIFICATION_ARRAY_ENTRIES];
    volatile uint8_t ucNotifyState[configTASK_NOTIFICATION_ARRAY_ENTRIES];
  #endif
} tskTCB;
```

### 关键字段分组

| 分组 | 字段 | 作用 |
|---|---|---|
| **现场锚点** | `pxTopOfStack` | 指向任务栈上当前上下文帧栈顶（**第 0 成员**） |
| **调度状态** | `xStateListItem` | 挂在哪张状态链（就绪/延时/挂起/终止） |
| **等待事件** | `xEventListItem` | 挂在哪个等待链（队列/信号量/事件组） |
| **优先级** | `uxPriority`, `uxBasePriority` | 当前/基底优先级（继承用） |
| **栈管理** | `pxStack`, `pxEndOfStack` | 栈基址/边界，栈溢出检测 |
| **任务属性** | `pcTaskName` | 名字（`configMAX_TASK_NAME_LEN`） |
| **临界区** | `uxCriticalNesting` | 临界区嵌套计数 |
| **任务通知** | `ulNotifiedValue`, `ucNotifyState` | 值/状态（`configTASK_NOTIFICATION_ARRAY_ENTRIES`） |
| **互斥锁** | `uxMutexesHeld` | 持锁数量（与继承配套） |

### 为什么"状态链"和"事件链"要拆两个节点

```
任务 T
 ├─ xStateListItem → 挂到"延时列表"(等超时)
 └─ xEventListItem → 挂到"队列等待(等数据)"  ← 两个节点, 两条链同时挂
```
- 若只有一个节点：任务要么在延时链、要么在事件链，**无法同时"等超时+等数据"**。
- 拆开后：**谁先到（超时 or 数据）就从谁唤醒**，语义正确。`xEventListItem` 的值还按**反序优先级**组织（`configMAX_PRIORITIES - uxPriority`），保证高优先级任务先被唤醒。

### 为什么 `uxBasePriority` 存在于且用于继承

- 互斥锁持有时，持锁任务**临时代理高优先级**（继承）；释放锁时需**恢复真实基底优先级**（`uxBasePriority`）。
- `uxMutexesHeld` 计数持锁数；若不加继承，就是裸调度（无继承），易触发优先级反转（见 Q15)。

### 工程场景

- **症状**：任务优先级"被抬高后没降回来"，导致任务长期霸占 CPU。
- **根因**：继承机制依赖 `uxBasePriority`/`uxMutexesHeld`，若锁过多/释放路径漏了恢复，优先级残留。
- **对策**：用互斥锁（自带继承）并确保 take/give 配对；排查用 `uxTaskPriorityGet` 看任务当前优先级 vs `uxBasePriority` 是否异常。

### 进阶追问链

1. **Q：TCB 里为什么要 `uxBasePriority`？** → 优先级继承需要它：锁持有时临时提级，释放时恢复到真实基底优先级；否则反转会犯。
2. **Q：任务被删除后 TCB 去哪了？** → `vTaskDelete(self)` 先放入 `xTasksWaitingTermination`（挂终止链），由 **Idle 任务**回收释放（不能在自己上下文释放自己的 TCB/栈）。
3. **Q：`pcTaskName` 最大长度？** → `configMAX_TASK_NAME_LEN`（默认 16），超长截断；只在调试/统计时用。
4. **Q：任务通知字段为什么是数组？** → `configTASK_NOTIFICATION_ARRAY_ENTRIES`（默认 1）支持"任务通知分 32 组"，像多个轻量信号量/事件标志，避免互相覆盖。

> 📌 一句话记忆：**TCB＝任务档案：pxTopOfStack(第0成员,指栈顶)＋xStateListItem(状态链)＋xEventListItem(事件链)＋uxPriority/uxBasePriority(继承)＋pxStack(栈溢出检测)＋pcTaskName＋uxCriticalNesting＋任务通知/互斥锁计数；一条状态链+一条事件链(超时vs数据竞争唤醒)；pxTopOfStack必须首位。**
