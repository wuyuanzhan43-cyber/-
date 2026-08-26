---
title: HardFault 怎么定位、通过哪些寄存器分析
id: hardfault-locate
category: rtos
difficulty: 5
tags: [RTOS, HardFault, 调试, Cortex-M]
company: [汽车电子, 智驾, 大疆]
keywords: HardFault CFSR HFSR BFAR MMFAR 异常帧 栈回溯 定位 UFSR BFSR MMFSR
answer: |
  **HardFault（硬故障）**是 Cortex-M 的**最高等级错误异常**，触发原因多为：**非法内存访问、未对齐访问、除零、跳转/执行非法地址、栈溢出、野指针、数组越界**。

  ### 定位依赖这批寄存器
  | 寄存器 | 作用 |
  |---|---|
  | `SCB->HFSR` | HardFault 状态（FORCED/VECTTBL 等） |
  | `SCB->CFSR` | 细分 3 种 fault：**UsageFault(UFSR)/BusFault(BFSR)/MemManage(MMFSR)** |
  | `SCB->BFAR` | **总线错误地址**（BFARVALID 时） |
  | `SCB->MMFAR` | **内存管理错误地址**（MMARVALID 时） |
  | 异常帧(栈上8字) | **崩溃点 PC、LR、xPSR、R0–R3/R12、SP** |
  | `IPSR` | 当前异常号（确认是 HardFault） |

  ### 定位步骤
  1. 在 `HardFault_Handler` 里关中断、读 **`SCB->HFSR/CFSR`** → 拆出具体类型。
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

### `SCB->CFSR` 细分位（重点背）

**UsageFault（UFSR，低 16 位）**
| 位 | 含义 |
|---|---|
| `UNALIGNED`(bit3) | 未对齐访问（如非对齐 32 位读） |
| `DIVBYZERO`(bit9) | 除零 |
| `INVSTATE`(bit1) | 执行了非法状态（如 `SVC` 在非法状态） |
| `INVPC`(bit0) | 非法异常返回（EXC_RETURN 无效） |

**BusFault（BFSR，位 16~25）**
| 位 | 含义 |
|---|---|
| `IBUSERR`(bit17) | 指令取指总线错误（PC 跳到非法/未映射地址） |
| `PRECISERR`(bit18) | 精确数据总线错误（有明确地址，`BFARVALID` 常置 1） |
| `IMPRECISERR`(bit19) | 非精确总线错误（无明确地址，常因写缓冲延迟） |
| `BFARVALID`(bit23) | `BFAR` 是否有效 |

**MemManage（MMFSR，位 26~31）**
| 位 | 含义 |
|---|---|
| `MMARVALID`(bit28) | `MMFAR` 是否有效 |
| `MSTKERR`/`MUNSTKERR` | 入栈/出栈时内存管理错误 |

### 从异常帧反查 PC（伪代码）

```c
void HardFault_Handler(void) {
  uint32_t *frame;                     // 异常帧在栈上
  __asm volatile("mrs r0, psp \n isb \n mov %0, r0" : "=r"(frame));
  // frame[0..6] = R0,R1,R2,R3,R12,LR(EXC_RETURN),PC,xPSR
  uint32_t pc = frame[6];              // 崩在哪条指令
  uint32_t lr = frame[5];              // 调用来源
  uint32_t cfsr = SCB->CFSR, hfsr = SCB->HFSR;
  uint32_t bfar = SCB->BFAR, mmfar = SCB->MMFAR;
  // 记录 cfsr/hfsr/bfar/mmfar/pc/lr 到崩溃日志(见 Q19)，再复位
}
```
- 用 **`SP`（MSP 或 PSP，看从哪个栈崩）** 定位异常帧；多数任务崩溃用 **PSP**，中断/系统崩溃用 **MSP**。
- 拿到 PC/LR 后，在 **IDE 反汇编/`addr2line`** 反查源码行。

### 借助工具

- **KEIL/STM32CubeIDE**：提供 **HardFault 异常处理器模板 + 寄存器/栈回溯**，可读 PC/LR 反查。
- **SEGGER SystemView / Ozone**：**实时跟踪 + 调用栈**，看"崩之前最后一个任务/调用"。
- **GDB `bt`**：连上调试器后查看**调用栈**、寄存器（`info reg`）、内存。

### 工程场景

- **症状**：随机 HardFault，崩溃点每次不同；或崩在某个外设访问。
- **根因**：野指针/数组越界（`BFAR/MMFAR` 给出坏地址）、栈溢出（写坏返回地址）、除零、非法跳转。
- **对策**：读 `CFSR` 分型 → 看地址 → 反查 PC/LR 源码行 → 结合栈溢出检测/断言定位根因；加 `configASSERT`、开启栈溢出钩子、用 `MPU` 挡越界访问。

### 进阶追问链

1. **Q：`BFAR` 一定有效吗？** → 不一定。只有 `BFSR.BFARVALID` 置位才有效；非精确总线错误（`IMPRECISERR`）可能**无有效地址**，需靠 PC/LR 反推。
2. **Q：从 `SP` 找异常帧时用哪个栈？** → 看崩溃在任务态还是异常态。任务上下文崩溃用 **PSP**（任务栈），中断/系统级崩溃用 **MSP**。读错栈就读不到 PC。
3. **Q：栈溢出和 HardFault 什么关系？** → 栈溢出常写坏返回地址/相邻内存 → 返回时跳到非法地址 → HardFault（BusFault/UsageFault）。崩在 HardFault 时要查是否栈溢出（结合 Q11/Q22）。
4. **Q：怎么区分 BusFault 与 MemManage？** → BusFault 是**总线/取指**问题（访问了不存在或未映射的内存），MemManage 是 **MPU/权限**（访问受保护区域）。看 CFSR 对应子域与 `BFAR`(总线地址)/`MMFAR`(内存管理地址)。

> 📌 一句话记忆：**HardFault 定位＝读SCB->CFSR拆类型(Bus/BFARVALID/MemManage/MMARVALID/Usage: UNALIGNED,DIVBYZERO,INVSTATE)＋HFSR＋BFAR/MMFAR拿错地址＋从异常帧(PSP/MSP)取PC/LR反查源码行＋LR回溯调用栈；配合栈溢出/断言判断根因。**
