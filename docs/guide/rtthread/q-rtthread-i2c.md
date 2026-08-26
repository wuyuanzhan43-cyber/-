---
title: I2C 总线框架（设备/传输/从机）
id: rtthread-i2c
category: rtthread
difficulty: 4
tags: [RT-Thread, I2C, 总线框架, 驱动]
company: [汇顶, 海康威视, 中兴]
keywords: RT-Thread I2C rt_i2c_bus rt_i2c_transfer 从机地址 应答 设备框架
answer: |
  **结论先行**：I2C 是一种**两线（SCL/SDA）、半双工、靠地址挂多从机、有应答（ACK）**的慢速同步总线。RT-Thread 用 **I2C 总线框架**把它抽象成“**I2C 总线设备（`rt_i2c_bus`）+ 从机设备**”，应用用 `rt_i2c_transfer` 收发。

  ### 基础概念
  - **SCL**（时钟）+ **SDA**（数据），**开漏 + 上拉**（实现线与、多主仲裁、从机应答）。
  - **寻址**：**芯片从机地址（7/10 位）**，一次传输按地址选中一个从机。
  - **时序**：`Start` → 从机地址+R/W → **ACK** → 数据/寄存器 → ... → `Stop`（或 `Repeated Start` 连续读写）。

  ### RT-Thread I2C 框架对象
  - **I2C 总线**：`rt_i2c_bus`（由 BSP 实现），`rt_i2c_bus_device_register` 注册，名如 `i2c0`。
  - **从机设备**：`rt_i2c_client`（可挂某总线上），用注册/`rt_i2c_bus_device_find("i2c0")` 拿到总线。
  - **传输接口**：`rt_i2c_transfer(bus, msg[], num)`，`struct rt_i2c_msg` 描述地址/标志(读/写/起始)/数据/长度。

  ### 一次读写（教学示例）
  ```c
  struct rt_i2c_bus_device *bus = rt_i2c_bus_device_find("i2c0");
  struct rt_i2c_msg msgs[2];
  uint8_t reg = 0x10;
  msgs[0].addr = 0x50; msgs[0].buf = &reg; msgs[0].len = 1;   // write: 寄存器地址
  msgs[1].addr = 0x50; msgs[1].flags = RT_I2C_RD; msgs[1].buf = data; msgs[1].len = 4; // read: 读4字节
  rt_i2c_transfer(bus, msgs, 2);                                // 先写寄存器再读(repeated start)
  ```

  ### 关键点 / 坑
  - **从机地址要与器件一致**（7 位地址，含 R/W 位别写错）。
  - **读寄存器要先“写寄存器地址”再“读”**（常配 `Repeated Start` 保证原子性）。
  - **最后一个字节读主机要回 NACK**（告诉从机停止）；`ACK/NACK` 是 I2C 应答的核心。
  - **时序/应答**：`Start/Stop`、`ACK`、`clock stretching`（从机拉低 SCL 等待）。
why: |
  这一题既要懂 **I2C 协议**，也要懂 **RT-Thread 怎么把它框架化**：
  - **为什么用总线框架**：I2C 是“**总线 + 从机**”结构；框架把“**总线（物理收发）**”与“**从机（器件逻辑）**”分开——换 I2C 控制器只改总线实现，器件驱动复用。
  - **为什么读写常是“先写寄存器地址再读数据”**：I2C 器件内部有**寄存器空间**，读数据前要先“*选中要读的寄存器*”；用 **Repeated Start** 把这两步做成**一次**传输，保证原子性（不会被别的从机/主抢线打断）。
  - **为什么要 ACK/NACK 与上拉**：`开漏+上拉` 是 `线与` 与 `多主仲裁` 的物理基础；`ACK` 是“从机收到/空闲”的确认，**读最后一字节主机回 NACK** 表示“够了，停止”，否则从机继续驱动 SDA 会异常。
  - 这一题答好，说明既懂**协议时序**，又懂**框架分层**（总线 vs 器件）。
---
<FlashCard />

## 深读

### I2C 时序要点

```
SCL ──┐    ┌──┐┌──┐┌──┐┌──┐    ┌──┐
SDA ──┘ Start│D7││D6│...│D0│ACK│Stop
          ↓地址+R/W    (数据字节)  (应答)
- Start: SDA 高→低(SCL 高)
- 数据: 每个 bit 在 SCL 高电平有效; 从机 ACK 拉低 SDA
- Repeated Start: 不先 Stop, 再发一次 Start(读写切换, 原子)
- Stop: SDA 低→高(SCL 高)
```

### 框架对象分层

```
[应用]   rt_i2c_bus_device_find("i2c0") + rt_i2c_transfer(msg[])
           ↓
[框架]   I2C 总线框架(msg 地址/标志/数据, 处理 start/stop/ack)
           ↓
[BSP]    rt_i2c_bus 实现(位操作/硬件 I2C 控制器, 真正拉 SCL/SDA)
- 从机器件(rt_i2c_client)实现“读哪个寄存器/怎么解析”, 复用
```

### 三类 I2C 实现（BSP 角度）

- **软件模拟**：GPIO 位操作（`rt_i2c_bit_ops`），灵活省硬件，但时序靠延时/中断。
- **硬件 I2C 控制器**：STM32 的 `I2Cx` 外设，`rt_hw_i2c` 实现，快但需配置 SCL/SDA 复用、时钟、DMA/中断。

### 常见坑

1. **地址错** → 从机地址/R/W 位搞错；确认器件文档地址与 `msg.addr`。
2. **读不到** → 忘了先写寄存器地址；或用了 `Stop` 拆成两次传输（被抢线）。
3. **总线卡死** → SCL/SDA 没上拉、被从机拉低；用探测/`重复初始化` 恢复。
4. **最后一字节回 NACK** → 读结束未回 NACK，从机继续驱动 SDA，总线异常。

### 进阶追问链

1. **Q：I2C 为什么能挂多从机？** → 靠**从机地址**（7/10 位）寻址，一主可以顺序访问多个不同地址的从机；总线上的 `Start/地址/应答` 决定“这次跟哪个从机说话”。
2. **Q：为什么读寄存器要先写寄存器地址？** → I2C 器件内部是**寄存器映射**，读前先“选定要读的寄存器（写地址）”，再读数据；用 `Repeated Start` 把两步合成一次，保证原子、不被抢线。
3. **Q：ACK/NACK 与上拉的作用？** → `开漏+上拉` 实现线与、多主仲裁、从机应答；`ACK` 表示从机收到/就绪；**读最后一字节主机回 NACK** 通知停止，否则从机继续驱动 SDA。
4. **Q：软件模拟 vs 硬件 I2C？** → 软件模拟用 GPIO 位操作（灵活、省外设、但时序靠延时）；硬件 I2C 用控制器（快、可配 DMA/中断，但需配置时钟/复用/模式）。RT-Thread 框架对两者都提供 `rt_i2c_bus` 适配。

> 📌 一句话记忆：**I2C＝SCL/SDA 两线开漏+上拉、靠从机地址挂多从、有 ACK(读最后字节主机回NACK)；RT-Thread 用 rt_i2c_bus(总线)+rt_i2c_client(从机)+rt_i2c_transfer(msg[地址/标志/数据])；读寄存器要“先写寄存器地址 Repeated Start 再读”；软模拟/硬 I2C 都走同一框架。**
