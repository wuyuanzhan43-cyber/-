---
title: BSP 移植（时钟 / 串口 / Flash / 中断）
id: rtthread-port-bsp
category: rtthread
difficulty: 4
tags: [RT-Thread, 移植, BSP, 板级支持包]
company: [智驾, 大疆, 汽车电子]
keywords: RT-Thread BSP 移植 板级 时钟 串口 Flash 中断 初始化
answer: |
  **结论先行**：把 RT-Thread 跑到一个新芯片/板子，靠 **BSP（板级支持包）**。BSP 要完成**板级初始化（时钟/串口/Flash/中断）**并把**设备注册进框架**，之后应用就能用 `rt_device_*` 访问。

  ### BSP 移植要做的事
  1. **启动与板级初始化**：对 Cortex-M 走 `rt_hw_board_init()`——配**系统时钟（HSE/PLL→SYSCLK/AHB/APB）**、**串口（调试控制台）**、**内存**、**滴答（SysTick）**、**中断控制器（NVIC）**。
  2. **时钟**：配 SysTick/硬件定时器做 tick；`RT_TICK_PER_SECOND`。
  3. **串口**：BSP 用 `rt_hw_serial_register` 注册串口设备，给 finsh/msh 与控制台用。
  4. **Flash**：配 FAL/Flash 驱动，供分区/文件系统/FlashDB 用。
  5. **中断**：`rt_hw_interrupt_install`/`rt_hw_interrupt_enable`，把外设中断挂到框架。
  6. **自动初始化**：用 `INIT_BOARD_EXPORT`/`INIT_DEVICE_EXPORT` 让板级/设备启动时自动初始化。

  ### 移植最小闭环
  ```
  复位 → 硬件启动(startup) → rt_hw_board_init(时钟/串口/内存/tick/NVIC)
    → rt_components_board_init(自动初始化设备)
    → rt_system_scheduler_init/start
    → 你的应用线程跑起来, 串口 msh 可交互
  ```
  - 跑通后，用 **msh/finsh** 的 `list_thread`/`list_device` 验证，再逐步加驱动/组件。

  ### 一句话
  **BSP 移植＝板级初始化(时钟/串口/Flash/中断/tick/NVIC) + 把设备注册进框架 + 自动初始化，让 RT-Thread 在板子上跑起来并能用 msh 交互。**
why: |
  这一题考“**怎么把 RT-Thread 弄到新芯片上**”，对比 FreeRTOS 的“纯移植”：
  - **为什么 BSP 要含时钟/串口/Flash/中断**：RT-Thread 运行时依赖**tick(时钟)、控制台(串口)、存储(Flash)、中断**；这些是“内核跑起来 + 你用得到”的最小集合。
  - **为什么用自动初始化**：RT-Thread 组件/驱动用 `INIT_*_EXPORT` 自动装配，BSP 里注册设备后，`rt_components_board_init()` 启动时自动初始化，**应用可直接用**。
  - **为什么串口很重要**：**msh/finsh（控制台 shell）**靠串口，是排错/验证的第一入口；所以 BSP 一定先把串口配好。
  - **和 FreeRTOS 对比**：FreeRTOS 移植只需“SysTick/PendSV/SVC + 上下文切换”，更“裸”；RT-Thread BSP 还要**板级初始化 + 设备框架 + 自动初始化**，更“成套”，也更省后续开发。
  - 这一题答好，说明你能**把 RT-Thread 落地到硬件**。
---
<FlashCard />

## 深读

### BSP 目录与文件（通常）

```
board/
  board.c        // rt_hw_board_init: 时钟/串口/内存/NVIC/tick
  board.h        // 板级配置(时钟频率/引脚/内存)
  Kconfig         // 板级配置项
  SConscript      // 构建脚本
  applications/main.c  // 应用入口
  drivers/       // 板级驱动(GPIO/串口/FLASH 等)
```

### 移植要点（Cortex-M）

```c
void rt_hw_board_init(void){
  SystemClock_Config();        // HSE/PLL → SYSCLK/AHB/APB
  rt_hw_uart_init(&uart0, "uart0");     // 注册串口(控制台)
  rt_hw_console_output = uart_puts;     // 控制台输出
  rt_system_heap_init(HEAP_BEGIN, HEAP_END); // 堆
  SysTick_Config(CLOCKS / RT_TICK_PER_SECOND); // tick
  NVIC_Configuration();                 // 中断
  // ... 之后 rt_components_board_init() 自动初始化设备/组件
}
```

### 常见坑

- **串口没注册/波特率错** → msh 无输出；用 `list_device` 查。
- **tick 不推进** → SysTick 没配/时钟源错；延时/调度停。
- **Flash/FAL 没配** → 文件系统/FlashDB 挂载失败。
- **自动初始化顺序** → 外设设备要 `INIT_DEVICE_EXPORT`，别漏。

### 进阶追问链

1. **Q：BSP 移植要做什么？** → 板级初始化（时钟/串口/内存/Flash/tick/NVIC）+ 把设备注册进框架 + 自动初始化；跑通后 msh `list_thread` 可验证。
2. **Q：为什么先配串口？** → 它是**控制台/msh 的入口**，排错、验证、打印全靠它；没有串口很难调试。
3. **Q：和 FreeRTOS 移植的区别？** → FreeRTOS 只移植 SysTick/PendSV/SVC + 上下文切换（更裸）；RT-Thread BSP 还要板级初始化 + 设备框架 + 自动初始化（更成套、开发省）。
4. **Q：用什么验证移植成功？** → 编译烧录后串口出现 **msh/finsh**，`list_thread`（有 idle/main 线程）、`list_device`（有 uart0）、定时器/tick 正常。

> 📌 一句话记忆：**RT-Thread BSP 移植＝板级初始化(rt_hw_board_init: 时钟HSE/PLL→SYSCLK、串口注册、内存堆、SysTick-tick、NVIC) + 设备注册进框架 + INIT_*_EXPORT 自动初始化 + 引入 ms 通信；跑通验证＝串口 msh、list_thread/list_device、tick 正常；对比 FreeRTOS 更“成套”。**
