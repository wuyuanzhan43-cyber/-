---
title: 中断优先级和任务优先级谁更高、冲突时怎么处理
id: interrupt-vs-task-priority
category: rtos
difficulty: 4
tags: [RTOS, 中断, 优先级, NVIC, 临界区, basepri]
company: [大疆, 智驾, 汇顶]
keywords: 中断优先级 任务优先级 抢占 临界区 configMAX_SYSCALL_INTERRUPT_PRIORITY basepri PRIMASK NVIC
answer: |
  **关键：这是两个不同维度，不能直接比大小。**
  - **中断优先级**是**硬件异常等级**（NVIC 配置），决定"哪个中断**优先响应/能否嵌套**"；
  - **任务优先级**是**调度器软件等级**（TCB 的 `uxPriority`），决定"哪个任务**优先得到 CPU**"。

  从"**谁先跑、谁能打断谁**"的现实语义看：**中断永远优先于任务**。因为中断是**异步硬件事件到紧急响应**——只要中断被使能且发生，处理器**立即脱离任务调度进入 ISR**，即使任务优先级再高也会被打断。只有"关中断/临界区"能把中断暂时挡在门外。

  **冲突处理（三层）**：
  1. **中断 vs 任务**：中断**绝对优先**。任务与中断共享数据时，任务侧用**关中断（`taskENTER_CRITICAL` → `basepri`）**或 `vTaskSuspendAll` 保护临界区。
  2. **中断 vs 中断**：NVIC **抢占优先级**决定能否**嵌套**（数值小=高），子优先级只定同抢占级下的先后。
  3. **能否在中断里用 RTOS API**：**`configMAX_SYSCALL_INTERRUPT_PRIORITY`** 划界——优先级**数值小于等于它（更紧急）**的中断**不能调用任何 FreeRTOS API**，只能做纯硬件、极短处理；**数值大于它（没那么紧急）**的中断可用 `FromISR` API。
why: |
  这一题考的是"**别把中断优先级和任务优先级混在一起比**"。很多人答"中断比任务高"只对了一半——它们不在一个维度：中断是**硬件抢占**，任务是**软件调度**。
  真正要处理的是**三类冲突**：
  - **任务被中断打断**（临界区被破坏）→ 用**关中断/basepri 或挂起调度器**保护；
  - **中断里不能阻塞/不能切任务** → 只用 `FromISR` API、标记 + `PendSV` 延迟切换；
  - **该中断能不能碰 RTOS 内核** → `configMAX_SYSCALL_INTERRUPT_PRIORITY` 划出安全区。
  顺带注意**数值方向**：STM32 抢占优先级**数值小=高**，FreeRTOS 任务优先级**数值大=高**，方向相反，特别容易说反。
---
<FlashCard />

## 深读

### 中断优先级 vs 任务优先级：两个维度

| 维度 | 中断优先级 | 任务优先级 |
|---|---|---|
| 归属 | 硬件（NVIC） | 软件（调度器，TCB `uxPriority`） |
| 决定什么 | 哪个中断**先响应**、能否**嵌套** | 哪个就绪任务**先运行**、能否**抢占** |
| 数值方向 | **小 = 高**（STM32/Cortex-M） | **大 = 高**（FreeRTOS） |
| 是否打断任务 | 是，**任何中断都优先于任何任务** | 只影响任务之间 |

### 为什么"中断永远优先于任务"

- 中断是**硬件异步事件**：处理器一旦收到且 NVIC 放行，就**立刻暂停当前任意执行流（含任何任务）进入 ISR**。
- 所以**任何任务（哪怕最高优先级）都可能被任一使能的中断打断**——这是"任务临界区必须关中断/挂起调度器"的根本原因。

### 寄存器/源码级：临界区的两种实现（PRIMASK vs basepri）

| 手段 | 机制 | 屏蔽范围 | 用在哪 |
|---|---|---|---|
| `taskENTER_CRITICAL`（→`portSET_INTERRUPT_MASK`） | 设置 **`PRIMASK`** 或 **`BASEPRI`** | PRIMASK=全关；BASEPRI=屏蔽≥阈值 | **极短**临界区 |
| `vTaskSuspendAll` | 计数 `uxSchedulerSuspended` | **不关中断**，只禁任务切换（ISR 照跑） | 较长序列/链表保护 |

- **`BASEPRI`（`configMAX_SYSCALL_INTERRUPT_PRIORITY`）**：设定临界区能屏蔽的**最高**SysCall 优先级——**数值 ≥ BASEPRI 的中断被屏蔽**（即"可能调 RTOS API"的中断），**更高优先级（更紧急）的中断不被屏蔽**（电机 PWM、安全关断等硬实时中断仍可响应）。
- **`PRIMASK`**：关**所有**可屏蔽中断，最严但最伤实时（连硬实时中断也关）。
- 这就是为什么要用 **`basepri` + `configMAX_SYSCALL_INTERRUPT_PRIORITY`** 而非 `PRIMASK`：**保住硬实时中断**。

### 优先级分组（STM32 NVIC）

- `NVIC_PriorityGroupConfig` 把优先级总位数（4 位）分成**抢占 + 子优**两级。
- **抢占优先级**决定能否**嵌套**（数值小=高）；**子优先级**只在同抢占级里**定先后**（不嵌套）。
- 不同任务/中断里**分组要一致**，否则嵌套行为混乱。

### 工程场景

- **症状**：进入一个"不重要"的中断后，实时任务/电机中断被拖住，响应失控。
- **根因**：把该中断优先级设得过高（数值过小），超过了 `configMAX_SYSCALL_INTERRUPT_PRIORITY`，导致它既不能调 RTOS API，又在临界区外霸占、或者反过来被屏蔽。
- **对策**：按"实时/安全 vs 内核 API 需求"分级——硬实时中断用**高于** `configMAX_SYSCALL_INTERRUPT_PRIORITY` 的优先级且**不调 RTOS API**；需要调 API 的中断优先级**低于等于**该阈值；任务侧用 `basepri` 保护而非 `PRIMASK`。

### 进阶追问链

1. **Q：为什么"中断比任务高"不完全对？** → 中断优先级是硬件抢占等级，任务优先级是软件调度等级，维度不同。从"能否打断任务"看中断优先；但从"能否在中断里调度/阻塞"看，中断反而受限。准确说法是"中断能抢占任务，但中断里不能做任务的事（调度/阻塞）"。
2. **Q：`configMAX_SYSCALL_INTERRUPT_PRIORITY` 具体含义？** → "能用 FreeRTOS API 的中断"的最高优先级。比它更紧急（数值更小）的中断运行期会被临界区屏蔽，因此**禁止调用 RTOS API**，只做纯硬件/极短。
3. **Q：跟 `basepri` 什么关系？** → 该宏就作为临界区 `BASEPRI` 的阈值（`portSET_INTERRUPT_MASK_FROM_ISR` 里写进 `BASEPRI`）。临界区只屏蔽"数值≥该阈值"（可能调 API）的中断，不屏蔽更紧急的硬实时中断。
4. **Q：任务里怎么访问被中断共享的数据？** → 短则 `taskENTER_CRITICAL`（basepri），长则 `vTaskSuspendAll`（挂起调度），或在任务间用队列/互斥/任务通知；绝不在临界区里做会阻塞的操作。

> 📌 一句话记忆：**中断优先级(NVIC,小=高)与任务优先级(TCB,大=高)是两维度；中断可抢占任何任务，但中断里不能阻塞/切任务；任务侧用 taskENTER_CRITICAL(basepri/BASEPRI=configMAX_SYSCALL_INTERRUPT_PRIORITY)或 vTaskSuspendAll 保护，保住硬实时中断；高优先级中断不调RTOS API。**
