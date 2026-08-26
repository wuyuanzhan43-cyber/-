---
title: 任务控制块（TCB）里保存了哪些信息
id: tcb-fields
category: rtos
difficulty: 4
tags: [RTOS, TCB, 数据结构, FreeRTOS]
company: [智驾, 大疆, 联发科]
keywords: TCB pxTopOfStack xStateListItem xEventListItem uxPriority pxStack 优先级继承
answer: |
  **TCB（任务控制块，`tskTCB`）是任务的全部"身份与状态"**，调度器靠它认任务。关键字段：
  - **`pxTopOfStack`**：指向任务栈上"**当前上下文帧**"的栈顶，**必须是 TCB 第 0 个成员**（移植层汇编直接按首地址读它，不做偏移）。
  - **`xStateListItem`**（`ListItem_t`）：**状态链节点**，挂在就绪/延时/挂起/终止链，决定"**能否被调度、何时唤醒**"。
  - **`xEventListItem`**（`ListItem_t`）：**事件链节点**，挂在队列/信号量/事件组等**等待链**，表示"**在等什么**"。
  - **`uxPriority`**：当前优先级；**`uxBasePriority`**：基底优先级（**优先级继承**时暂存用）。
  - **`pxStack`**：任务栈的**基址**（用于**栈溢出检测**）；`pxEndOfStack`（栈向下增长时的栈尾边界）。
  - **`pcTaskName`**：任务名字符串。
  - **`uxCriticalNesting`**：**临界区嵌套计数**（锁外层数，进入/退出临界区 +-1）。
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

### TCB 关键字段分组

| 分组 | 字段 | 作用 |
|---|---|---|
| **现场锚点** | `pxTopOfStack` | 指向任务栈上当前上下文帧栈顶（**第 0 成员**） |
| **调度状态** | `xStateListItem` | 挂在哪张状态链（就绪/延时/挂起/终止） |
| **等待事件** | `xEventListItem` | 挂在哪个等待链（队列/信号量/事件组） |
| **优先级** | `uxPriority`, `uxBasePriority` | 当前/基底优先级（继承用） |
| **栈管理** | `pxStack`, `pxEndOfStack` | 栈基址/边界，栈溢出检测 |
| **任务属性** | `pcTaskName` | 名字 |
| **临界区** | `uxCriticalNesting` | 临界区嵌套计数 |
| **任务通知** | `ulNotifiedValue`, `ucNotifyState` | 值/状态（`configUSE_TASK_NOTIFICATIONS`） |
| **互斥锁** | `uxMutexesHeld` | 持锁数量（与继承配套） |

### 为什么 `pxTopOfStack` 必须第一位

上下文切换汇编（`vPortPendSVHandler`）直接：
```asm
LDR R0, =pxCurrentTCB   ; 当前 TCB 地址对
LDR R1, [R0]            ; 取出 pxCurrentTCB
STR R0, [R1]            ; 把新栈顶直接写到 TCB 偏移 0
```
它**不查字段名、不偏移**，默认地址[0] 就是 `pxTopOfStack`。所以**必须是首个成员**，任何插入到它前面的字段都会让移植层读到错值 → 现场错乱。

### 为什么"状态链"和"事件链"要拆两个节点

```
任务 T
 ├─ xStateListItem → 挂到"延时列表"(等超时)
 └─ xEventListItem → 挂到"队列等待(等数据)"  ← 两个节点, 两条链同时挂
```
- 若只有一个节点：任务要么在延时链、要么在事件链，**无法同时"等超时+等数据"**。
- 拆开后：**谁先到（超时 or 数据）就从谁唤醒**，语义正确。`xEventListItem` 的值还按**反序优先级**组织，保证高优先级任务先被唤醒。

### 常见追问

- **Q：TCB 里为什么有 `uxBasePriority`？**
  A：**优先级继承**需要它。互斥锁持有时临时提升优先级，释放时需恢复到**真实的基底优先级**（`uxBasePriority`）；若不加临时提升，就是裸调度（无继承），易触发优先级反转。

- **Q：任务被删除后 TCB 去哪了？**
  A：`vTaskDelete(self)` 会先把 TCB 放入 `xTasksWaitingTermination`（挂在终止链），由 **Idle 任务**回收释放——因为**不能在自己上下文里释放自己的 TCB/栈**。

- **Q：`pcTaskName` 最大长度？**
  A：`configMAX_TASK_NAME_LEN`（默认 16），超长会被截断；只在 `configUSE_TRACE_FACILITY` 开启时用于调试。

> 📌 一句话记忆：**TCB＝任务档案：pxTopOfStack(第0成员,指栈顶)＋xStateListItem(状态链)＋xEventListItem(事件链)＋uxPriority/uxBasePriority(继承)＋pxStack(栈溢出检测)＋pcTaskName＋uxCriticalNesting＋任务通知/互斥锁计数；一条状态链+一条事件链(超时vs数据竞争唤醒)。**
