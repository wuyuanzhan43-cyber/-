---
title: SPI 总线框架（模式/片选/收发）
id: rtthread-spi
category: rtthread
difficulty: 4
tags: [RT-Thread, SPI, 总线框架, 驱动]
company: [智驾, 大疆, 中兴]
keywords: RT-Thread SPI rt_spi_bus rt_spi_device rt_spi_transfer CPOL CPHA 片选 全双工
answer: |
  **结论先行**：SPI 是一种**4 线（SCLK/MOSI/MISO/CS）、全双工、靠片选(CS)挂多从机、有 CPOL/CPHA 时序模式**的高速同步总线。RT-Thread 用 **SPI 总线框架**抽象成“**总线（`rt_spi_bus`）+ 从机设备（`rt_spi_device`）**”，应用用 `rt_spi_transfer` 收发。

  ### 基础概念
  - **SCLK**（时钟）+ **MOSI**（主出从入）+ **MISO**（从出主入）+ **CS**（片选，每从机一条）。
  - 每从机用自己的 **CS** 选中；**全双工**（同一次收发都传）。
  - **CPOL**（时钟极性）+ **CPHA**（时钟相位）组合成 **4 种 SPI 模式**（0~3），**主从必须一致**。
  - “**发送必伴随接收**”（全双工），读数据要先发占位（如 `0xFF`）只为产生时钟。

  ### RT-Thread SPI 框架对象
  - **总线**：`rt_spi_bus`（BSP 实现，`rt_hw_spi_register` 注册，名如 `spi0`）。
  - **从机设备**：`rt_spi_device`（挂总线、带片选），`rt_spi_bus_attach_device` 挂载，名如 `spi10`（一个从机一个设备）。
  - **配置模式**：`rt_spi_configure`（`struct rt_spi_configuration`: `mode`(CPOL/CPHA+位序)、`data_width`、`max_hz`）。
  - **收发**：`rt_spi_transfer(dev, send, recv, len)`（全双工）；`rt_spi_send`/`rt_spi_recv`。

  ### 一次读写（教学示例）
  ```c
  struct rt_spi_device *dev = (struct rt_spi_device *)rt_device_find("spi10");
  struct rt_spi_configuration cfg = { SPI_BUS_MODE_0, 8, 1000000 };
  rt_spi_configure(dev, &cfg);
  rt_spi_send(dev, cmd, 1);            // 发命令
  rt_spi_transfer(dev, tx, rx, len);   // 全双工收发
  ```

  ### 关键点 / 坑
  - **模式(CPOL/CPHA)与从机一致**；位序 MSB/LSB 也要对。
  - **CS 片选**由框架/驱动在传输时拉低再拉高；多从机不能共享 CS。
  - **全双工与“伪写”**：读要发占位字节（如 `0xFF`）产生时钟，数据在 MISO 同步收回。
why: |
  这一题既要懂 **SPI 协议**，也要懂 **RT-Thread 怎么把它框架化**（与 I2C 框架对照最好的例子）：
  - **为什么用总线框架**：SPI 是“**总线 + 片选从机**”；框架把“**总线（时钟/收发）**”与“**从机（片选/器件逻辑）**”分离——换控制器只改总线实现，器件驱动复用（读 Flash/传感器就一个设备）。
  - **为什么有 `rt_spi_configure`（mode/hz/位序）**：SPI 的**时序模式、速率、位序**必须与从机匹配，配置封装成 `struct rt_spi_configuration`，避免到处散落寄存器赋值。
  - **为什么“发送必伴随接收”**：SPI 是全双工，每一拍 SCLK 同时移入移出；读数据时要“**靠发占位字节产生时钟**”，否则没有时钟、读不到。这是 SPI 与 I2C（半双工、靠 ACK）最大的区别。
  - **为什么用 CS 片选**：SPI 没有“从机地址”，靠**每从机独立 CS** 选中；CS 拉低=选中、拉高=释放，所以同总线多从机各占一根 CS。
  - 这一题答好，说明既懂 **CPOL/CPHA** 又懂 **框架分层与全双工**。
---
<FlashCard />

## 深读

### SPI 四种模式（CPOL/CPHA）

| 模式 | CPOL | CPHA | 数据采样/移位 |
|---|---|---|---|
| **0** | 低 | 前沿 | 时钟低为闲，前沿采样 |
| **1** | 低 | 后沿 | 时钟低为闲，后沿采样 |
| **2** | 高 | 前沿 | 时钟高为闲，前沿采样 |
| **3** | 高 | 后沿 | 时钟高为闲，后沿采样 |

- **主从必须同模式**，否则数据位错（读乱码）。

### 框架对象分层

```
[应用]  rt_device_find("spi10") + rt_spi_configure(mode/hz) + rt_spi_transfer/send/recv
          ↓
[框架]  SPI 总线框架(配置/全双工收发/片选管理)
          ↓
[BSP]   rt_spi_bus 实现(硬件 SPI 控制器或 GPIO 模拟, 拉 SCLK/MOSI/MISO/CS)
- 从机设备(rt_spi_device) = “某个片选上的器件”, 复用
```

### 全双工的“伪写”读数据

```c
uint8_t tx = 0xFF;          // 占位, 只为了产生时钟
rt_spi_transfer(dev, &tx, &rx, 1);   // 发 tx(0xFF), 同时米 MISO 收 rx
```
- 读 Flash/传感器寄存器：**先发命令/地址，再读 N 字节（每字节发占位 0xFF）**，数据在 MISO 收回。

### 常见坑

1. **模式错** → CPOL/CPHA 与从机不一致 → 读乱码。用 `rt_spi_configure` 设对 mode。
2. **CS 共用/没片选** → 多从机互扰；每从机一根 CS，或在驱动里管理 CS。
3. **读不到** → 忘发占位字节（无时钟）；或 MISO/MOSI 接反。
4. **速率超** → `max_hz` 超从机上限；降速率。

### 进阶追问链

1. **Q：SPI 和 I2C 区别？** → SPI：4 线、全双工、靠 CS 片选、快、无应答；I2C：2 线、半双工、靠地址 + ACK、慢、省线。SPI 适合高速（Flash/传感器），I2C 适合省线多从机。
2. **Q：CPOL/CPHA 干嘛用？** → 定义时钟空闲电平与采样沿，决定**数据何时被采样**；主从不一致就采样错位读乱码。SPI 有 4 种模式，靠 `rt_spi_configure` 配置。
3. **Q：为什么读要先发占位字节？** → SPI 全双工，每拍 SCLK 同步移入移出；读数据必须**有时钟**，而时钟由“主发数据”驱动，所以发占位（`0xFF`）只为产生采样时钟，数据在 MISO 收回。
4. **Q：SPI 怎么挂多个从机？** → 每个从机一根 **CS**（片选），传输时拉低对应 CS 选中；同一 SCLK/MOSI/MISO 共享，各从机靠自己的 CS 区分。
5. **Q：硬件 SPI 和 GPIO 模拟？** → 硬件 SPI 用控制器（快、可 DMA）；GPIO 模拟（`rt_spi_bit_ops`）灵活省外设、慢。RT-Thread 框架对两者都适配成 `rt_spi_bus`。

> 📌 一句话记忆：**SPI＝SCLK/MOSI/MISO/CS 4线、全双工、靠CS片选、CPOL/CPHA 4模式需主从一致；RT-Thread 用 rt_spi_bus(总线)+rt_spi_device(从机,带CS)+rt_spi_configure(mode/hz/位序)+rt_spi_transfer/send/recv；全双工读要先发占位(0xFF)产生时钟；读乱码先查 CPOL/CPHA 与 MISO/MOSI。**
