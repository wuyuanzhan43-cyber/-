---
title: ARM 指令集：ARM vs Thumb-2 与流水线
id: arm-instruction
category: arm
difficulty: 3
tags: [ARM, 指令集, Thumb]
company: [中兴, 汇顶]
keywords: ARM Thumb Thumb-2 指令集 代码密度 流水线 分支预测
answer: |
  **ARM 指令集**：
  - **ARM（32 位）指令**：固定 32 位宽度，**RISC**，支持**条件执行**（`ADDEQ` 等）、`LDR/STR/B/BL/CMP` 等；**功能强但代码密度低**。
  - **Thumb（16 位）指令**：**代码密度高**（省 Flash/RAM），但功能受限（条件执行少、寄存器受限）。
  - **Thumb-2**：**16/32 位混合**，兼顾**性能与代码密度**，是 Cortex-M 的主流（大多数 Cortex-M 用 Thumb-2）。
  - **NEON**：SIMD（单指令多数据），用于多媒体/信号处理。
  **流水线**：**取指/译码/执行**多级流水（如 3/5 级），提高吞吐；**分支**会打断流水（需**分支预测**/跳转延迟）。**PC 在流水线中提前预取**（这解释了异常返回地址偏移）。
  **汇编常用**：`LDR/STR/MOV/ADD/SUB/CMP/B/BL/PUSH/POP`，`BNE/BEQ`（条件分支）。
why: |
  **ARM vs Thumb-2 的权衡是“性能 vs 代码密度”**：嵌入式 Flash/RAM 有限，常选 **Thumb-2**（密度高且性能好）存代码；**ARM** 指令更强但占空间。理解**流水线/分支**与 **PC 预取**才能看懂汇编与异常返回地址。
  这也是**为什么启动文件/内核常用汇编**、**为什么 Cortex-M 用 Thumb-2**（省空间），以及**编译器 `-mthumb`/`-marm`** 的取舍。
---
<FlashCard />

## 深读

### 指令集对照

| | ARM 指令 | Thumb | Thumb-2 |
|---|---|---|---|
| 宽度 | 32 | 16 | 16/32 混合 |
| 代码密度 | 低 | 高 | 中高 |
| 功能 | 全（条件执行等） | 受限 | 较强 |
| 适用 | Cortex-A/高性能 | 老MCU | **Cortex-M 主流** |

- **Thumb-2**：混合 16/32 位，兼顾密度与性能，是 ARMv7-M（Cortex-M）主流。
- **NEON**：SIMD，多媒体/信号。

### 流水线

- 多级流水（取指/译码/执行/访存/写回）提高吞吐。
- **PC 提前取**（如取指 PC=L+8）→ 异常返回地址偏移（LR-4 等）。
- **分支**会清空流水（跳转延迟/惩罚），**分支预测**减少惩罚。

### 常用汇编指令

```asm
LDR r0, [r1]      ; 从内存加载
STR r0, [r1]      ; 存到内存
MOV r0, #1        ; 立即数
ADD r0, r0, #1    ; 加
CMP r0, #0        ; 比较
BEQ label         ; 相等跳转(条件分支)
BL func           ; 带链接跳转(保存返回地址到LR)
PUSH {r4,lr}      ; 压栈
POP  {r4,pc}      ; 弹栈返回
```

- `PUSH/POP` 是 **Thumb** 语法；**ARM 态**对应 **`STMDB`/`LDMIA`**（如 `STMDB sp!, {r4,lr}` / `LDMIA sp!, {r4,pc}`）。

### 常见追问

- 为什么 Cortex-M 用 Thumb-2？——代码密度高（省 Flash），性能可，编译支持好。
- ARM 和 Thumb 区别？——宽度/密度/功能；ARM 强但占空间，Thumb 省空间但受限，Thumb-2 折中。
- 为什么 PC 预取导致异常返回偏移？——流水线提前取指，进入异常时 LR 已比实际返回地址超前。
- 什么是分支预测？——预测分支方向减少流水线冲刷，提高效率。

> 📌 一句话记忆：**ARM(32,强但占空间)/Thumb(16,省空间)/Thumb-2(混合,Cortex-M主流)；流水线取指+PC预取→异常返回偏移；分支预测提效。**
