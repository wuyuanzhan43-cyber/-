---
title: FreeRTOS 任务切换的完整流程是什么
id: task-switch-flow
category: rtos
difficulty: 5
tags: [RTOS, 上下文切换, PendSV, 调度器]
company: [智驾, 大疆, 华为]
keywords: 两阶段切换 记账 vTaskSwitchContext PENDSVSET 位图 CLZ 恢复现场 汇编
answer: |
  FreeRTOS 任务切换是**两阶段**：**① 内核"记账"（决定该切） + ② PendSV 汇编"真切换"（执行切换）**。

  **阶段① 记账（软件，内核/API 内部）**：某个 API（`vTaskDelay`/阻塞/挂起/主动让出）把当前任务的 `xStateListItem` **从就绪链表挪到目标链**（延时链/事件等待链/挂起链），并**置位 `PENDSVSET`** 请求切换（`portYIELD`）——只标记"该选了"，**此时不切**。

  **阶段② 真切换（PendSV 异常内，`vPortPendSVHandler` 汇编）**：
  1. PendSV 异常进入 → **硬件自动压栈** R0–R3/R12/LR/PC/xPSR 到当前任务栈。
  2. 汇编**手动保存 R4–R11** 到当前任务栈（+ 可选浮点）。
  3. 更新当前任务 **TCB 的 `pxTopOfStack`** 指向新栈顶。
  4. 调 **`vTaskSwitchContext()`**：用 `uxTopReadyPriority` 位图 + `CLZ` **O(1) 选最高就绪优先级**，取该就绪链头任务，更新 **`pxCurrentTCB`**。
  5. 读新任务 TCB 的 `pxTopOfStack`，把 **`PSP` 设为新任务栈顶**。
  6. 从新任务栈 **恢复 R4–R11**（弹栈）。
  7. **`BX LR`**（`EXC_RETURN`）：硬件弹栈恢复 R0–R3/R12/PC/xPSR，进入刚被切出的新任务上下文继续运行。

  **中断里请求切换**：`portYIELD_FROM_ISR` 只**挂起 PendSV 做标记**，等 ISR 结束回到任务态才真正切——避免在中断里切换。
why: |
  任务切换最容易被问"要不要手动保存寄存器、会不会在哪一步卡死"。关键是理解**两段式**：
  - **为什么分两段**：保存/恢复寄存器、操作 PSP 是**架构相关**，只能放**移植层汇编**；而"选谁运行、把任务挪到哪条链"是**纯软件策略**，放**内核层**。
  - **为什么切换要用 PendSV**：`PendSV` 优先级最低、可挂起，保证**不在中断里切**，且切换过程不被更高级中断打断（原子）。
  - **O(1) 选最高优先级**：`uxTopReadyPriority` 位图 + `CLZ` 一条指令拿到最高就绪优先级，所以**调度开销与任务数无关**。
  理解这两段，就能回答"切换在哪发生、寄存器谁存、为什么是 O(1)、为什么中断里不切"。
---
<FlashCard />

## 深读

### 两阶段任务切换总览

| 阶段 | 在哪 | 做什么 |
|---|---|---|
| ① 记账 | 内核 API | 把 `xStateListItem` 移到目标链 + 置位 `PENDSVSET`（"该选了"） |
| ② 切换 | `vPortPendSVHandler` 汇编 | 保存现场→选新任务→恢复现场→返回 |

### 阶段② 汇编细节（Cortex-M）

```
vPortPendSVHandler:
  ; (进入时硬件已自动压 R0-R3/R12/LR/PC/xPSR 到当前栈)
  mrs r0, psp                ; 拿当前任务栈顶
  ; 手动压 R4-R11(+浮点) 到栈上
  stmdb r0!, {r4-r11}        ; 保存被调用者保存寄存器
  ; 把新栈顶写回当前任务 TCB (pxTopOfStack)
  ... 更新 pxCurrentTCB->pxTopOfStack = r0
  ; 选下一个任务
  vTaskSwitchContext()       ; 位图+CLZ 找最高就绪优先, 更新 pxCurrentTCB
  ; 恢复新任务
  ldr r0, [pxCurrentTCB]     ; 新任务 TCB
  ldr r0, [r0]               ; 新任务 pxTopOfStack
  msr psp, r0                ; PSP = 新任务栈顶
  ldmia r0!, {r4-r11}        ; 恢复 R4-R11
  bx lr                      ; EXC_RETURN: 硬件弹 8 字, 回到新任务被切出处
```

### O(1) 选最高优先级

- `uxTopReadyPriority` **位图**：bit N=1 表示优先级 N 有就绪任务；配合 **`CLZ`（前导零计数）** 一条指令算出最高就绪优先级。
- 再用 `pxReadyTasksLists[prio]` 取该优先级的就绪链表头任务（同优先级时间片轮转在此体现）。
- 所以调度器选下一个任务是**常数时间**，开销不随任务数增长。

### 常见追问

- **Q：为什么切换不在内核 C 函数里直接做，而要进 PendSV 异常？**
  A：保存/恢复寄存器、操作 PSP 是**架构相关**，且切换需要"不被打断的原子性"。用优先级最低、可挂起的 PendSV，既把架构部分放汇编，又保证**中断里不切、切换不被打断**。

- **Q：中断里触发了高优先级任务就绪，为什么不会立刻切？**
  A：`portYIELD_FROM_ISR` 只**挂起 PendSV（置位 PENDSVSET）**，不立即切换。等当前 ISR 结束、回到任务态，PendSV 才进入执行真切换——避免在中断上下文切换（违反调度纪律）。

- **Q：如果切换中途来了更高优先级中断会怎样？**
  A：PendSV 设成**最低优先级**，所以它运行时**不会有更高优先级中断来打断它**（更高优先的 ISR 只会排在 PendSV 之前处理完）。切换本身原子，不会被拆。

> 📌 一句话记忆：**任务切换＝两段：①内核记账(挪链+PENDSVSET)+②PendSV汇编(保存R4-R11→vTaskSwitchContext位图+CLZ选最高→恢复R4-R11→BX LR)；O(1)选任务，用最低优先级PendSV保证中断里不切、切换原子。**
