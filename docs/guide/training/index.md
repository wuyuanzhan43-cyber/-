# 吴沅展 · 针对性训练（不投 Linux）

> 这是把你简历对标的**面试训练方案**搬进了题库，并升级成 **HTML 交互卡片（〈FlashCard〉自测）**。
> 本页是**训练总览**（怎么准备、哪些是红线），分两大类可翻卡自测的 FlashCard：
> ① **嵌入式底子**（C / OS-RTOS / 总线 / MCU-ARM 基础八股，必拿分）
> ② **项目深挖预判**（围绕你两个项目的面试题，防露怯）
> 学习顺序与题库索引见 **[吴沅展针对性学习地图](/guide/method/targeted-training)**。

## 一、为什么这么准备（核心判断）

你两段项目都**严重超纲**（应届生通常做不出双核异构 + 边缘 AI + 一套 OSAL 框架），这是**杀手锏**，但也是**最高危的追问区**。
面试官见这种简历的第一反应是：**怀疑 + 深挖**——

> 「这是你自己做的吗？双核为什么用 HSEM？INT8 量化怎么校准的？准确率怎么测的？CAN 为什么用 MPSC？零拷贝省在哪？——**讲不清任何一个，加分项就反噬成减分项。**」

所以策略只有一条：**把简历上每个高级名词，都降到「能画图 / 能写伪代码 / 能说为什么」的颗粒度。**

## 二、简历风险雷达

| 简历亮点 | 面试官会怎么挖 | 风险 | 对应 FlashCard / 题库 |
|---|---|---|---|
| 双核异构 + HSEM | SMP/AMP？为什么 HSEM 不用普通锁？核间通信？ | 🔴 爆点 | [项目一·双核](q-project1-dualcore-hsem)、`arm/q-riscv` |
| TFLM INT8 量化 + tensor arena | 量化原理？校准？精度损失？arena 怎么规划？ | 🔴 爆点 | [项目一·量化](q-project1-edgeai-quant)、`ai/q-tflm-int8` |
| 「准确率板级验证」 | 准确率多少？怎么测？实时性？ | 🟡 | [项目一·指标](q-project1-metrics) |
| CAN MPSC / 串口 DMA+PingPongbuf | 为什么无锁？双缓冲？DMA 怎么配？缓存一致性？ | 🔴 爆点 | [项目二·零拷贝](q-project2-zerocopy)、`bus/q-dma` |
| 零拷贝 | 省了几次拷贝？mmap/sendfile 原理？ | 🟡 | [项目二·零拷贝](q-project2-zerocopy) |
| OSAL / 分层架构 | 为什么分层？换 RTOS 改多少？ | 🟡 | [项目二·架构](q-project2-layered-arch) |
| 无锁/原子/MPSC/bufpool | 为什么无锁？CAS？伪共享？ | 🔴 爆点 | [项目二·无锁](q-project2-lockfree)、`arch/q-lockfree-mpsc` |
| 完成量 / workqueue | 和信号量区别？解决什么？ | 🟡 | [项目二·同步](q-project2-sync) |
| 面向对象/设计模式/SOLID | C 怎么做 OOP？举一个模式 | 🟡 | `arch/q-oop-in-c` |
| 通信状态机/粘包拆包 | 怎么定一帧完整？粘包/半包？转义？ | 🟡 | [项目一·BLE](q-project1-ble-frame)、`bus/q-uart-deep` |
| RISC-V 青稞V4 双核 | RISC-V vs ARM？特权级？哪个核跑 Linux？ | 🟡 | `arm/q-riscv`、[RISC-V 补充](q-riscv-dualcore) |

## 三、面试红线（应届生 + 高级简历最容易踩的雷）

1. **别说是「课程作业/别人的」**——每一点都要能讲「我做了什么、为什么、遇到什么坑、怎么解决」。
2. **高级名词只给结论 = 露怯**——讲 HSEM / INT8 / MPSC / 零拷贝时，**至少能画图或写 3 行伪代码**。
3. **诚实 vs 吹嘘**——JDY-18 是 BLE 透传模块、你用的是 RISC-V 不是 STM32；承认边界 + 说明你在边界内做了什么，比硬撑更稳。
4. **「了解」vs「熟悉」别自相矛盾**——你框架用了无锁/原子/OSAL，就别再说「只是了解内存管理」，统一口径并备好源码级细节。
5. **数字要真实、要能推导**——准确率、耗时、内存、模型大小务必是板级实测，并说清怎么测的。
6. **不要只背八股不连线项目**——答完 FreeRTOS 要接一句「这在我框架的 XX 组件里就用了」。

## 四、怎么用这套 FlashCard

1. **先翻卡**：看[题目]（如「讲一下你双核架构」）→ 点「👀 显示标准答案」→ 对照你**会不会这么答**。
2. **自测打分**：答得出打「🟢 熟」、答不出打「🔴 生」——进度记录在本地，自动进「错题本 / 记忆曲线」。
3. **答完连项目**：每张卡最后都有「把八股接回你项目」的提示，学会在答题末尾加一句关联（这是你拿分的关键）。
4. **循环**：生了的标记，隔天回来再翻，直到「熟」为止。

## 五、嵌入式底子 FlashCard 一览（先打底子，再攻项目）

### C 语言底子
- [指针 vs 数组 / 指针数组 vs 数组指针](q-base-c-pointer-array)
- [程序内存布局（.text/.data/.bss/堆/栈）](q-base-c-memory-layout)
- [volatile 作用与局限](q-base-c-volatile)
- [结构体内存对齐](q-base-c-alignment)
- [位操作与位域](q-base-c-bitops)
- [static / const / extern 作用](q-base-c-storage-class)
- [无符号数与整型陷阱](q-base-c-unsigned)
- [函数指针与回调](q-base-c-funcptr)

### OS / RTOS 底子
- [进程 / 线程 / 任务区别与调度](q-base-os-proc-thread)
- [RTOS 任务五状态与调度机制](q-base-os-sched)
- [信号量 vs 互斥锁 / 优先级反转](q-base-os-sync)
- [中断上下文与 ISR 里能做什么](q-base-os-interrupt)
- [栈 / 堆 / 动态与静态分配](q-base-os-memory)

### 总线底子
- [UART 帧 / 波特率 / 电平 / 乱码排查](q-base-bus-uart)
- [I2C vs SPI vs UART 区别与时序](q-base-bus-i2c-spi)
- [CAN 总线（多主/仲裁/差分/终端电阻）](q-base-bus-can)

### MCU / ARM 底子
- [ARM/STM32 启动过程 / 异常向量表 / 大小端](q-base-arm-boot)
- [GPIO / 定时器(PWM) / ADC 基础](q-base-mcu-gpio-timer)

## 六、项目深挖 FlashCard 一览

- [项目一·双核架构与 HSEM 为什么](q-project1-dualcore-hsem)
- [项目一·边缘 AI：INT8 量化 + tensor arena](q-project1-edgeai-quant)
- [项目一·BLE 传输与粘包/拆包](q-project1-ble-frame)
- [项目一·指标：准确率 / 耗时 / 内存怎么测](q-project1-metrics)
- [项目二·分层架构与驱动模型为什么](q-project2-layered-arch)
- [项目二·无锁 / 原子 / MPSC / bufpool](q-project2-lockfree)
- [项目二·零拷贝：DMA + PingPongbuf + 缓存一致性](q-project2-zerocopy)
- [项目二·完成量 / workqueue 异步机制](q-project2-sync)
- [补充·边缘 AI 端云协同全链路](q-edgeai-deploy)
- [补充·RISC-V 双核对照与迁移故事](q-riscv-dualcore)
