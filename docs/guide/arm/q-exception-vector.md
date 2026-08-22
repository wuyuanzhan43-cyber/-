---
title: ARM 异常向量表与启动流程
id: exception-vector
category: arm
difficulty: 3
tags: [ARM, 异常, 启动]
company: [中兴, 大疆]
keywords: 复位向量 异常向量表 CPSR 模式切换 启动流程 SVC mode
answer: |
  ARM 复位后从**复位向量（通常 0x00000000 或由 VBAR/重映射决定）**开始取指，进入特定处理器模式（ARM 的 SVC 模式 / 或特权模式），执行启动代码。
  **异常向量表**：一段固定偏移、每 4 字节一个的跳转槽，对应不同异常/中断（Reset、Undefined Instruction、SWI、Prefetch Abort、Data Abort、IRQ、FIQ 等），表的起始地址由 **VBAR（Vector Base Address Register）/重映射**决定。中断发生时，CPU 根据异常类型跳到对应向量，再跳到处理函数。
  启动流程（ARM 裸机/嵌入式 Linux）：
  1. **复位** → 特权模式，向量表地址。
  2. 建立栈、时钟、初始化（清 BSS、拷贝数据段）。
  3. 初始化必需外设，设置 MMU/内存。
  4. 跳转到 C 代码（`main` 或内核入口）。
  所以“从复位到跑 C”经历了**设置向量表/栈、初始化内存与大写段、跳转到高层语言**这几步。
why: |
  异常/中断是 CPU 响应外部事件的机制，向量表是它的**入口地图**；启动流程则是“从一条固定的复位地址，一步步走到可运行 C 世界”的必经之路。
  理解向量表与启动顺序，才能定位“为什么上电没反应/为什么中断不进/为什么卡在汇编”，也是驱动与内核开发的基础。
---
<FlashCard />

## 深读

### ARM 异常类型（经典）

| 异常 | 向量偏移 | 入口 | 典型原因 |
|---|---|---|---|
| Reset | 0x00 | 复位 | 上电/复位 |
| Undefined Instruction | 0x04 | undefined | 未定义指令 |
| SWI/SVC | 0x08 | 软中断 | 系统调用 |
| Prefetch Abort | 0x0C | 取指中止 | 指令取失败 |
| Data Abort | 0x10 | 数据中止 | 数据访问失败 |
| IRQ | 0x18 | 普通中断 | 外部中断 |
| FIQ | 0x1C | 快速中断 | 快速/高优先级 |

不同异常进入不同**处理器模式**（CPSR 切换），用不同**影子寄存器组**，处理完后 `MOVS PC, LR`/`SRS`/`RFE` 恢复。

### 启动到底做了什么（ARM 裸机）

```asm
; 复位入口（示例）
_start:
  ldr sp, =__stack_top   ; 1. 建栈（当前模式）
  bl  copy_data          ; 2. 拷贝 .data 到 RAM
  bl  clear_bss          ; 3. 清零 .bss
  bl  system_init        ; 4. 时钟/外设/MMU
  bl  main               ; 5. 进 C 世界
```

若跑 Linux：UBoot → 内核汇编（`head.S`/`stext`）建页表/MMU → `start_kernel`（C）。

### MMU/重映射与向量表作用

- **高地址/重映射（remap）**：很多系统把向量表重定位到 RAM 或高地址，用 **VBAR** 指定，便于动态修改（如中断例程升级）。
- **向量表是个“跳转表”**：每个槽跳到对应 handler（常见是 `ldr pc, =handler` 或 `b handler`）。

### 常见追问

- 为什么复位后是特权模式？——保证启动代码有权限初始化硬件、建 MMU、改寄存器；用户态受限则做不了。
- 为什么要在 C 世界之前清 BSS、拷数据段？——C 运行依赖全局/静态变量已初始化（data）与零初始化（bss/stack），否则全局变量是垃圾值。
- 什么是 FIQ vs IRQ？——FIQ 更快（更多影子寄存器、可快速响应），用于硬实时/高优先级；IRQ 是普通中断，可被 FIQ 打断。

> 📌 一句话记忆：**复位向量→特权模式→建栈/初始化→清BSS拷data→进C；异常向量表是中断/异常的“入口跳转地图”。**
