---
title: 中断现场保护保存哪些寄存器、由谁保存
id: isr-save-registers
category: rtos
difficulty: 3
tags: [RTOS, 中断, Cortex-M, 异常栈帧, AAPCS]
company: [智驾, 大疆, 汇顶]
keywords: 异常栈帧 硬件自动压栈 R0-R3 R12 LR PC xPSR EXC_RETURN MSP PSP lazy stacking
answer: |
  Cortex-M 进异常时**硬件（NVIC/内核）自动压栈**保存"**异常进入栈帧（exception frame）**"到**当前栈**：

  ### 基础帧（8 字 / 32 字节）
  `R0`、`R1`、`R2`、`R3`、`R12`、`LR(R14)`、`PC(R15)`、`xPSR`。

  ### 启用 FPU 且使用浮点时
  额外压入**扩展帧**——`S0–S15`、`FPSCR`、一个保留字。是否压入由 **lazy stacking** 与 `EXC_RETURN` 决定：只有**真的用到浮点**才压（减少无浮点中断的开销）。

  ### 由谁负责（分层）
  1. **硬件自动压栈**：这 8 字（及扩展帧）是内核响应异常时**自动**压到当前 SP 的，无需写代码。压到哪个栈取决于当前指针——**线程态**用 **PSP**，**异常态/裸机**用 **MSP**。
  2. **软件只补"被调用者保存寄存器"**：`R4–R11` 是 callee-saved，被中断打断的代码可能正用着。**普通中断**里由**编译器在 ISR prologue 按 AAPCS 按需保存**；**任务切换**里由 **FreeRTOS 汇编**保存。
  3. **返回由硬件恢复**：异常返回时，`BX LR` 用 **`EXC_RETURN`** 决定**从哪个栈弹、是否含浮点帧、回到哪种模式**，硬件弹异常帧、恢复被打断的现场。

  ### 一句话
  硬件自动压 **8 字（R0–R3/R12/LR/PC/xPSR，可选浮点扩展帧）**到当前栈；**callee-saved（R4–R11）**由编译器/RTOS 补；**`EXC_RETURN`** 决定返回用哪个栈/是否浮点。
why: |
  被问"中断保存哪些寄存器"最容易答成"所有寄存器都保存"。Cortex-M 的**硬件自动压栈**只保存"**能让代码继续跑的最小集**"：
  - **caller-saved（R0–R3/R12）**：函数调用方自己保护，中断打断了先手也被"调用者"保护。
  - **控制流**：`LR`、`PC`、`xPSR` 必须保存才能**回到被打断处**并恢复状态位。
  - **callee-saved（R4–R11）**：由编译器/RTOS 负责——这正是"任务切换要手动补 R4–R11"的原因。
  分清「**硬件压 8 字 / 编译器与 RTOS 补 R4–R11 / EXC_RETURN 决定返回**」三段，就能答对"由谁保存、存到哪、返回怎么恢复"。
---
<FlashCard />

## 深读

### 异常进入栈帧（exception frame）结构

Cortex-M 进异常时自动压栈（**最高地址先进栈**，R0 在栈顶之上、xPSR 更深）：

```
地址低 ────────────────────── 地址高
┌────────────────────────────────┐
│ S0..S15（仅 FPU 使用且未 lazy） │ ← 扩展帧(可选)
│ FPSCR + 保留字                  │
├────────────────────────────────┤
│ R0                             │ ← 基础帧(8 字, 必压)
│ R1                             │
│ R2                             │
│ R3                             │
│ R12                            │
│ LR (EXC_RETURN)                │
│ PC(被打断处下一条)             │
│ xPSR                           │
└────────────────────────────────┘
```

- 基础帧 = **32 字节**；扩展帧（含 FPU）= 基础帧 + `S0–S15`(16字) + `FPSCR`(1字) + 保留(1字)。

### `EXC_RETURN`（LR 特殊值）编码

| 位 | 含义 |
|---|---|
| bit2 | 返回用 **MSP(0) / PSP(1)** |
| bit3 | 返回 **handler mode(0) / thread mode(1)** |
| bit4 | 是否恢复 **FPU 扩展帧** |

- 常见值：`0xFFFFFFF1`（handler→MSP+FPU）、`0xFFFFFFF9`（thread→MSP）、`0xFFFFFFFD`（thread→PSP）、`0xFFFFFFE1`（thread→PSP+FPU 等）。

### AAPCS：为什么硬件只压"半集"

| 类型 | 寄存器 | 谁保存 |
|---|---|---|
| **caller-saved** | R0–R3、R12 | 调用方/被暂停代码保护；进异常由硬件压（用作参数/临时） |
| **callee-saved** | R4–R11 | 被调用方（编译器/RTOS）保护——**硬件不压** |
| 控制流/状态 | LR、PC、xPSR | 必须压，才能回原处 |

- 说明：硬件压 R0–R3/R12 是"**顺便**"保存了调用者保存寄存器和临时寄存器，但**真正的主因**是压 **PC（回到哪）和 xPSR（状态）**，缺一不可。

### lazy stacking（浮点）

- 默认**开启**时，进异常**只压基础 8 字**，FPU 寄存器**推迟**到"真要写浮点寄存器"时才压。
- 好处：大量**无浮点**中断节省入栈/出栈；`EXC_RETURN` bit4 用来标识"该帧是否含 FPU 扩展"，返回时据此弹。

### 工程场景

- **症状**：在 ISR 里用浮点运算后，FPU 寄存器被"下一次中断"污染，任务计算错乱。
- **根因**：`lazy stacking`/`EXC_RETURN` 未正确配置，或 ISR 用到浮点但没让内核知道要保存扩展帧；各任务浮点上下文没随切换保存。
- **对策**：使能浮点任务间切换（`portTASK_USES_FPU`/`vPortEnableFPU`）、配置浮点栈帧、必要时关 `lazy stacking`（`FPU->FPCAR`/`FPCCR.ASPEN` 配置），并用 `EXC_RETURN` 校验恢复路径。

### 进阶追问链

1. **Q：为什么中断里不用手动保存 R4–R11？** → ISR 是 C 函数，编译器按 AAPCS 在 prologue 保存会用的 callee-saved 寄存器；R4–R11 需要 RTOS 手动保存是针对**任务切换**（跨多层函数调用，编译器级不够）。
2. **Q：用 PSP 还是 MSP 压异常帧？** → 线程态（任务/主程序）压 **PSP**；已在异常/裸机任务态压 **MSP**。读异常帧要从正确的 SP 读（见 Q21）。
3. **Q：硬件只压 8 字，任务切换怎么完整？** → 进 PendSV 硬件压 8 字，`vPortPendSVHandler` 再 `stmdb r0!,{r4-r11}` 补 R4–R11（+FPU），两者合成完整上下文帧。
4. **Q：浮点寄存器什么时候才压栈？** → 启用 FPU 且异常时使用浮点（或关闭 lazy stacking）才压 `S0–S15/FPSCR`；是否恢复由 EXC_RETURN bit4 决定。

> 📌 一句话记忆：**Cortex-M 硬件进异常自动压 8 字＝R0–R3/R12/LR/PC/xPSR（+可选 FPU 扩展帧×lazy stacking）到当前栈；callee-saved R4–R11 由编译器/RTOS 补；返回用 EXC_RETURN 弹栈恢复。**
