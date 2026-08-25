---
title: 补充·RISC-V 双核对照与迁移故事（Q→A）
id: riscv-dualcore
category: training
difficulty: 4
tags: [RISC-V, 青稞V4, 双核, 迁移]
company: [沁恒, 大疆, 汇顶]
keywords: RISC-V ARM 特权级 CSR 双核 迁移 青稞V4
answer: |
  **Q：你简历说「熟悉 RISC-V（沁恒青稞V4双核）」，RISC-V 和 ARM 有什么区别？你的双核是什么架构？哪个核跑 Linux 哪个跑裸机？**

  **A（你怎么答）：**
  **RISC-V vs ARM**：
  - **RISC-V**：**开源、精简、模块化、无历史包袱、指令少、可扩展**；系统寄存器用 **CSR** 访问。
  - **ARM**：商业授权、指令更丰富，用协处理器/内存映射，Cortex-M 用异常向量表 + NVIC，**没有 M/S/U 特权级**概念。
  - **特权级**：RISC-V 有 **M（机器）/ S（监督）/ U（用户）** 三模式；**M 模式跑裸机/RTOS**，**S 模式跑 Linux（需要 MMU）**，**U 模式跑用户程序**。ARM Cortex-M 只有 Handler/Thread 模式，没有 M/S/U。

  **关键 CSR**：`mstatus`（状态）、`mtvec`（异常入口地址）、`mcause`（异常原因）、`mepc`（返回地址）、`mhartid`（多核区分哪个核）。RISC-V 用**统一 trap 入口**（跳到 `mtvec`）比 ARM **更简单**。

  **我的双核是什么架构**：**AMP（非对称多处理）**——核0 跑裸机/RTOS（实时采集+推理，M 模式），核1 跑通信栈（也可裸机/RTOS），**各核独立、无统一 OS 调度**，核间靠**共享内存 + HSEM 硬件信号量**协作。若未来要跑 Linux，则**有 MMU 的核在 S 模式跑 Linux**，没 MMU 的核在 M 模式跑实时任务——这就是 AMP 的**异构**。

  **迁移故事（加分）**：我从 **Cortex-M 迁移到 RISC-V**，本质变化是**特权级 + CSR + 内存映射**，但**C 语言、外设驱动、RTOS 想法完全通用**——迁移成本主要在**启动/异常/工具链**，业务逻辑几乎不动。
why: |
  这题考「**你说的 RISC-V 是真是懂还是跟风**」。能对比出 **RISC-V 开源精简 + M/S/U 特权级 + CSR**、并说清 **你的双核是 AMP 异构（哪个核跑什么）**、再补一段「**从 ARM 迁移到 RISC-V 的故事**」，就是真懂，也把「会用芯片」升级成「懂架构」。
---
<FlashCard />

## 深读

### RISC-V vs ARM 速查
| | RISC-V | ARM Cortex-M |
|---|---|---|
| 授权 | 开源 | 商业 |
| 指令 | 精简、可扩展 | 相对固定 |
| 系统寄存器 | **CSR**（mstatus/mtvec/mcause） | 协处理器/内存映射 |
| 特权级 | **M/S/U** | Handler/Thread（无 M/S/U） |
| 中断 | 统一 trap 入口 | 异常向量表 + NVIC |
| 多核 | 靠 mhartid 区分 | 各有实现 |

### 关键 CSR 背四个
- `mtvec`：异常/中断入口地址
- `mcause`：异常原因
- `mepc`：异常返回地址
- `mhartid`：多核区分

### 哪个核跑什么（对应 AMP 异构）
```
核0: M 模式, 裸机/RTOS, 实时采集+推理  ←─ 实时
核1: M 模式, RTOS, 通信栈            ←─ 通信
(若跑 Linux: 有 MMU 的核 → S 模式; 无 MMU → M 模式)
```

### 把八股接回项目
答完加一句：「**从 Cortex-M 迁移到 RISC-V，我发现底层（总线/外设/RTOS）想法是通用的，变的只是特权级、启动和工具链——这也证明我框架里 OSAL 抽象的价值。**」
