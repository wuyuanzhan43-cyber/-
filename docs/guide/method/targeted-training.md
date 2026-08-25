# 吴沅展 · 针对性学习地图（不投 Linux）

> 这份地图把 **《40.嵌入式八股》原有题库** + **本轮新补的「简历缺口」内容** 按你的简历串成一条学习路径。
> 你只要**按顺序**把每题过一遍（先读卡、再自测、能用嘴讲出「为什么」），再回头答面试题就不慌。
> **不涉及 Linux**：投 MCU / RTOS / 消费电子 / 传感器方向，Linux 驱动/设备树/内核模块等不用学；只保留与零拷贝/DMA/缓存一致性相关的通用概念。

## 一、你的简历 → 题库映射（先知道要学哪些）

| 你的简历亮点 | 对应学习卡 | 状态 |
|---|---|---|
| FreeRTOS 任务调度、队列、信号量、互斥锁、事件组 | `os/q-freertos-task-src`、`os/q-freertos-queue-src`、`os/q-freertos-memory`、`os/q-rtos-schedule` | 原有 |
| 并发编程、同步原语 | `os/q-semaphore-mutex`、`os/q-priority-inversion`、`os/q-deadlock`、`os/q-spinlock` | 原有 |
| 双核异构、HSEM 硬件信号量 | `os/q-multicore`、**`arm/q-riscv`**（新） | 原有+新 |
| 外设 GPIO/ADC/USART/I2C/SPI/定时器/PWM | `mcu/q-gpio-config`、`mcu/q-adc`、`mcu/q-mcu-uart`、`mcu/q-timer-pwm`、`bus/q-i2c-timing`、`bus/q-spi-cpol-cpha` | 原有 |
| 通信协议 BLE/串口/I2C/SPI、粘包拆包、状态机 | `bus/q-uart-deep`、`bus/q-bus`、`c/q-bitfield-protocol`、`ds/q-ring-buffer` | 原有 |
| 边缘 AI（TFLM INT8 量化、tensor arena） | **`ai/q-tflm-int8`、`ai/q-tensor-arena`、`ai/index`**（新） | 🔴 新补（必学） |
| RISC-V（沁恒青稞V4 双核） | **`arm/q-riscv`**（新） | 🔴 新补 |
| 无锁/原子/MPSC/零拷贝 | **`arch/q-lockfree-mpsc`**（新）、`bus/q-dma`、`ds/q-ring-buffer` | 🔴 新补+原有 |
| 面向对象/设计模式/SOLID/驱动模型 | **`arch/q-oop-in-c`**（新）、`c/q-function-pointer` | 🔴 新补 |
| 完成量/workqueue/异步 | **`arch/q-completion-workqueue`**（新）、`os/q-isr-main-coop` | 🔴 新补 |
| ARM 体系、启动、Cortex-M 移植 | `arm/q-arm-registers`、`arm/q-stm32-boot`、`arm/q-cortexm-port`、`arm/q-endian` | 原有 |
| 程序内存布局、栈/堆、内存池 | `c/q-memory-layout`、`c/q-stack-heap`、`c/q-memory-pool` | 原有 |
| 编译链接、交叉编译、工具链 | `toolchain/q-build-link`、`q-cross-compile`、`q-makefile`、`q-opt` | 原有 |

## 二、学习顺序（P0 → P1 → P2，非 Linux）

### P0 — 必考，且是你简历的直接支撑（先啃）
1. **FreeRTOS 任务与调度源码** → `os/q-freertos-task-src`、`os/q-rtos-schedule`
2. **队列/信号量/互斥锁** → `os/q-freertos-queue-src`、`os/q-freertos-memory`、`os/q-semaphore-mutex`
3. **优先级反转 + 死锁** → `os/q-priority-inversion`、`os/q-deadlock`
4. **多核 SMP/AMP + HSEM** → `os/q-multicore`、**`arm/q-riscv`**
5. **无锁/原子/MPSC/内存屏障** → **`arch/q-lockfree-mpsc`**、`ds/q-ring-buffer`
6. **C：volatile/内存布局/可重入** → `c/q-volatile`、`c/q-memory-layout`、`c/q-reentrant`

### P1 — 高命中，与你外设/总线经验吻合
7. **总线总览** → `bus/q-bus`
8. **UART 深入（乱码/丢字节/流控/帧解析）** → `bus/q-uart-deep`
9. **CAN 总线 + 仲裁** → `bus/q-can`、`bus/q-can-arbitration`
10. **DMA（中断/轮询/DMA、缓存一致性）** → `bus/q-dma`
11. **面向对象/设计模式/驱动模型** → **`arch/q-oop-in-c`**
12. **完成量/workqueue** → **`arch/q-completion-workqueue`**

### P2 — 加分/防御（按需补）
13. **边缘 AI（INT8 量化 + tensor arena）** → **`ai/q-tflm-int8`、`ai/q-tensor-arena`**（项目一必须）
14. **GPIO/定时器PWM/ADC** → `mcu/q-gpio-config`、`mcu/q-timer-pwm`、`mcu/q-adc`
15. **ARM：寄存器/启动/Cortex-M 移植/大小端** → `arm/q-arm-registers`、`arm/q-stm32-boot`、`arm/q-cortexm-port`、`arm/q-endian`
16. **编译链接/交叉编译/优化等级** → `toolchain/q-build-link`、`q-cross-compile`、`q-opt`

## 三、关键记忆点（背到能脱口而出）

- **FreeRTOS 调度**：「固定优先级抢占 + 时间片轮转；`uxTopReadyPriority` 位图 + CLZ 实现 O(1) 选最高优先级。」
- **信号量 vs 互斥锁**：「互斥锁有所有权 + 优先级继承；信号量只是计数同步、无所有权。」
- **优先级反转**：「高优先级被『持锁的低优先级 + 插队的中优先级』拖住；用互斥锁自带的优先级继承/天花板来救。」
- **SMP vs AMP**：「SMP=统一 OS + 共享内存 + 跨核调度；AMP=各核独立/异构分工；核间靠共享内存 + IPI + mailbox；SMP 硬件一致、AMP 需软件同步 + 屏障。」
- **无锁/MPSC**：「单消费者读侧无锁、多生产者写侧用原子(CAS)抢占；原子≠内存序，乱序要配内存屏障；缓存一致性/伪共享靠屏障+对齐填充。」
- **C 面向对象**：「结构体(数据) + 函数指针(接口/多态/vtable)；依赖倒置——上层依赖抽象接口而非具体实现。」
- **DMA**：「轮询=简单占CPU，中断=省CPU仍靠CPU搬，DMA=硬件引擎搬、CPU只善后；大块高速用DMA+完成中断，注意缓存一致性。」
- **CAN**：「多主、差分、按标识符逐位仲裁(ID越小优先级越高)、带检错自动重发；两端各120Ω终端电阻。」
- **INT8 量化**：「量化=用 scale+zero_point 把 float32 映射成 int8；scale 由范围定、激活范围靠校准集统计(min/max 或 KL)；收益是 4 倍省内存+快+省电，代价是精度损失。」
- **tensor arena**：「推理期预分配的固定临时 RAM，存中间张量、运行时复用、大小=峰值；本质是用「预分配+复用」代替 malloc。」
- **RISC-V**：「M/S/U 特权级 + CSR + 统一 trap 入口(mtvec/mcause/mepc)；双核=AMP 异构，核间共享内存+HSEM 硬件信号量+内存屏障。」

## 四、怎么学（迭代法）

1. **读**：进 `docs/guide/...` 读对应卡（题 → 答案 → 为什么 → 深读）。
2. **自测**：开 `docs/study.md` 自测页刷该题，标「熟/生」。
3. **讲**：用「费曼法」把题讲给自己/别人，讲不顺就回读。
4. **连项目**：每学一个，问「我项目里哪用到了」，答题末尾加那句关联（这是你拿分的关键）。
5. **过关**：能无停顿答出「为什么」，才算过这一题；别只会背名词。

> 学完 P0 + P1（+ 项目一的边缘 AI、RISC-V），你就可以回来打「项目深挖」环节了——那一刻你已经能把题库和你自己做的系统闭环讲出来。
