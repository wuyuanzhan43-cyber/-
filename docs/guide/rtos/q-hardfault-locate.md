---
title: HardFault 怎么定位、通过哪些寄存器分析
id: hardfault-locate
category: rtos
difficulty: 5
tags: [RTOS, HardFault, 调试, Cortex-M]
company: [汽车电子, 智驾, 大疆]
keywords: HardFault CFSR HFSR BFAR MMFAR 异常帧 栈回溯 定位
answer: |
  **HardFault（硬故障）**是 Cortex-M 的**最高等级错误异常**，触发原因多为：**非法内存访问、未对齐访问、除零、跳转/执行非法地址、栈溢出、野指针、数组越界**。

  **定位依赖这批寄存器**：
  | 寄存器 | 作用 |
  |---|---|
  | `SCB->HFSR` | HardFault 状态（FORCED/VECTTBL 等） |
  | `SCB->CFSR` | 细分 3 种 fault：**UsageFault(UFSR)/BusFault(BFSR)/MemManage(MMFSR)** |
  | `SCB->BFAR` | **总线错误地址**（BFARVALID 时） |
  | `SCB->MMFAR` | **内存管理错误地址**（MMARVALID 时） |
  | 异常帧(栈上8字) | **崩溃点 PC、LR、xPSR、R0–R3/R12、SP** |
  | `IPSR` | 当前异常号（确认是 HardFault） |

  **定位步骤**：
  1. 在 `HardFault_Handler` 里关中断、读 **`SCB->HFSR/CFSR`** → 拆出具体类型：
     - **UFSR**：未对齐(`UNALIGNED`)、除零(`DIVBYZERO`)、无效指令(`INVSTATE`)。
     - **BFSR**：总线错误——`IBUSERR`(取指)/`PRECISERR`(精确)/`IMPRECISERR`(非精确)/`BFARVALID`。
     - **MMFSR**：内存管理——越界/非法访问。
  2. 读 **`BFAR/MMFAR`** 拿**出错地址**（若 VALID 置位）。
  3. 从 **SP 指向的异常帧**取 **`PC`（崩在哪条指令）与 `LR`（调用来源）**，用**反汇编/源码映射**反查函数与行号。
  4. 用 **`LR`/栈帧（FP）回溯调用栈**，定位到具体函数/调用点。
  5. 结合 **栈溢出检测、`configASSERT`、指针/边界检查**判断根因（野指针/越界/栈溢出/除零）。
why: |
  面试考的是"**会不会从寄存器倒推崩溃点**"，而不是只会说"进 HardFault 了"。关键在于：
  - **CFSR 细分类型**决定方向：BusFault 多半是**非法地址/外设访问**；MemManage 是**MPU/越界**；UsageFault 是**未对齐/除零/非法指令**。先定位类型，才能对症。
  - **BFAR/MMFAR 给出出错地址**：直接指向"访问了哪个非法地址"，是野指针/数组越界最有力的证据。
  - **异常帧里的 PC/LR**：PC 是"崩在哪条指令"，LR 是"从哪调用进来"，靠它才能**反查源码行**，否则只会看汇编。
  这一题和 **Q19（保留现场）**相辅相成：Q19 讲"怎么把现场捞出来"，Q21 讲"拿到现场后怎么分析寄存器"。
---
<FlashCard />

## 深读

### HardFault 常见诱因 → CFSR 对应位

| 诱因 | CFSR 相关位 | 说明 |
|---|---|---|
| 非法地址访问 | `BFSR`：`PRECISERR`/`IMPRECISERR` + `BFARVALD` | 读/写了不该写的地址（野指针、越界） |
| 取指失败 | `BFSR`：`IBUSERR` | PC 跳到非法/未映射地址 |
| 未对齐访问 | `UFSR`：`UNALIGNED` | 如非对齐的 32 位访问 |
| 除零 | `UFSR`：`DIVBYZERO` | 除数为 0 |
| 非法指令/状态 | `UFSR`：`INVSTATE`/`INVPC` | 执行了异常指令/非法状态 |
| MPU 越界 | `MMFSR`：`MMARVALID` + `MMFAR` | 触发 MPU/内存管理 |

### 从异常帧反查 PC 例（伪代码）

```c
void HardFault_Handler(void) {
  uint32_t *frame;                     // 异常帧在栈上
  __asm volatile("mrs r0, psp \n isb \n mov %0, r0" : "=r"(frame));
  // frame[0..6] = R0-R3,R12,LR,PC,xPSR
  uint32_t pc = frame[6];              // 崩在哪条指令
  uint32_t lr = frame[5];              // 调用来源
  uint32_t cfsr = SCB->CFSR, hfsr = SCB->HFSR;
  uint32_t bfar = SCB->BFAR, mmfar = SCB->MMFAR;
  // 记录 cfsr/hfsr/bfar/mmfar/pc/lr 到崩溃日志(见 Q19)，再复位
}
```
- 用 **`SP`（MSP 或 PSP 看是从哪个栈崩的）** 定位异常帧；多数任务崩溃用 **PSP**，中断/系统崩溃用 **MSP**。
- 拿到 PC/LR 后，在 **IDE 反汇编/`addr2line`** 反查源码行。

### 借助工具

- **KEIL/STM32CubeIDE**：提供 **HardFault 异常处理器模板 + 寄存器/栈回溯**，可读 PC/LR 反查。
- **SEGGER SystemView / Ozone**：**实时跟踪 + 调用栈**，能看"崩之前最后一个任务/调用"。
- **GDB `bt`**：连上调试器后查看**调用栈**、寄存器（`info reg`）、内存。

### 常见追问

- **Q：`BFAR` 一定有效吗？**
  A：不一定。只有 **`BFSR.BFARVALID`** 置位才有效；非精确总线错误（`IMPRECISERR`）可能**无有效地址**，需靠 **PC/LR** 反推。

- **Q：从 `SP` 找异常帧时用哪个栈？**
  A：看崩溃发生在**任务态还是异常态**。任务上下文崩溃用 **PSP**（任务栈），中断/系统级崩溃用 **MSP**。读错栈就读不到 PC。

- **Q：栈溢出和 HardFault 什么关系？**
  A：栈溢出常**写坏返回地址/相邻内存** → 返回时跳到非法地址 → **HardFault**（BusFault/UsageFault）。所以崩在 HardFault 时，也要**查是否栈溢出**（结合 Q11/Q22）。

> 📌 一句话记忆：**HardFault 定位＝读SCB->CFSR拆类型(Bus/MemManage/Usage)＋BFAR/MMFAR拿错地址＋从异常帧(PSP/MSP)取PC/LR反查源码行＋LR回溯调用栈；配合栈溢出/断言判断根因。**
