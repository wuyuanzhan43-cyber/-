---
title: STM32 启动过程
id: stm32-boot
category: arm
difficulty: 3
tags: [ARM, STM32, 启动, 裸机]
company: [汇顶, 中兴]
keywords: 启动文件 复位向量 初始 SP 初始 PC 堆栈 时钟 SystemInit main
answer: |
  STM32（Cortex-M）上电后**从固定地址取初始**内容（由启动文件 `.s`/`startup_xxx.s` 定义的中断向量表头部）：
  1. 复位后 CPU 从**复位向量**（地址 0）读两点：**初始栈指针 `SP`** 与 **复位地址 `PC`**（向量表前两个字）。
  2. `PC` 跳到 **`Reset_Handler`**，接下来：**拷贝 `.data` 段**到 RAM、**清零 `.bss` 段**、设置**堆栈**，随后调用 **`SystemInit`**（配置系统时钟/总线）。
  3. 最后跳到 **`main`**，开始用户 `C` 程序。
  启动文件需与**链接脚本（.ld/链接器脚本，定义 Flash/RAM 段与入口）**配合；**向量表**位于 Flash 起始处（约 `0x08000000`，用 `0x20000000` 起始的 SRAM）。还可通过 `SCB->VTOR` 重定位向量表。
why: |
  它回答“**上电后 CPU 第一步到底做了什么**”。Cortex-M 用“向量表前两项 = 初始 SP/PC”的方式启动，比 Cortex-A 的复杂 MMU/异常流程简单（M 核没有 MMU，直接物理地址）。
  理解启动文件 + 链接脚本，才能定位**复位后卡住/全局变量初值错误/时钟未配好/程序跑飞**等裸机经典问题。
---
<FlashCard />

## 深读

### Cortex-M 启动要点

- **M 核无 MMU**：复位后直接跑物理地址，无需建页表/MMU。
- **向量表**：放在 Flash 起始（`0x08000000`），第 0 项 = **初始 MSP**，第 1 项 = **复位地址（PC）**，后续是各异常/中断的入口。
- **复位流程**：
  1. CPU 读向量表第 0/1 项，设好 `SP`、跳到 `Reset_Handler`。
  2. `Reset_Handler`（启动文件）：拷贝 `.data` 到 RAM、清 `.bss`、设栈；常调用 `SystemInit()` 配置时钟。
  3. 跳 `main`。

### 启动文件 `.s` 里做什么

```
; 启动文件（示例）
__initial_sp  -> 栈顶地址
Reset_Handler:
  LDR   R0, =__data_start
  LDR   R1, =__data_end
  ...                         ; 拷贝 .data
  LDR   R0, =__bss_start
  LDR   R1, =__bss_end
  ...                         ; 清零 .bss
  BL    SystemInit            ; 配时钟
  BL    main                  ; 进 C
  B     .                     ; 死循环兜底
```

- **`.data`**：已初始化的全局/静态变量，初值要拷到 RAM。
- **`.bss`**：未初始化的全局/静态变量，要清零（否则初值垃圾）。
- **`.text`**：代码，放 Flash。

### 链接脚本（.ld）配合

- 定义 **Flash** 与 **RAM** 起始/大小，把 `.text/.rodata` 放 Flash、`.data/.bss` 放 RAM、`__data_start/__data_end`、`__bss_start/__bss_end` 等符号供启动文件使用。
- **入口地址**与**堆栈**大小也在脚本里定义，供初始 SP 使用。

### 常见“启动不了”排查

| 现象 | 排查方向 |
|---|---|
| 复位后卡住/无反应 | 电源/时钟/复位脚、向量表是否在正确地址、启动文件入口 |
| 全局变量初值不对 | `.data` 拷贝是否执行、链接脚本段地址 |
| 时钟不对 | `SystemInit`/时钟配置 |
| 进 main 前跑飞 | 栈是否设置、`.bss` 是否清零 |
| 0x0800 起始（Flash）、0x2000 起始（RAM） | 确认向量表/链接脚本对应正确 |

### 与 Cortex-A 对比

- **Cortex-M**：无 MMU，向量表简单，直接从复位向量跑。
- **Cortex-A**：复杂，需建页表、配 MMU、异常向量表、启动多级流程（常配合 Bootloader/内核）。
- STM32 也有**自举（Boot）**：通过 `BOOT0/BOOT1` 选择从 Flash/系统存储器/RAM 启动。

### 常见追问

- 为什么初始 SP/PC 在向量表前两项？——Cortex-M 规范如此：复位用一个向量取回 SP 与 PC，无需指令，极简。
- 为什么 `.bss` 要清零而 `.data` 要拷贝？——C 运行环境要求全局变量初始化：`data` 有初值（拷），`bss` 初值 0（清），栈也要设好。
- 为什么常从 `0x08000000` 启动？——STM32 Flash 映射基址，`BOOT` 决定启动介质。

> 📌 一句话记忆：**STM32 上电 → 读向量表前两项(初始SP/PC) → Reset_Handler(拷data/清bss/设栈/SystemInit) → main。**
