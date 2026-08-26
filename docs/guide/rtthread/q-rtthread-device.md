---
title: RT-Thread 设备框架（rt_device / 串口 / I2C / SPI）
id: rtthread-device
category: rtthread
difficulty: 4
tags: [RT-Thread, 设备框架, rt_device, 驱动, 串口,I2C,SPI]
company: [大疆, 智驾, 汇顶]
keywords: RT-Thread 设备框架 rt_device 设备模型 open/read/write/control 串口 I2C SPI 驱动
answer: |
  **RT-Thread 内置一套“设备框架”**：把外设（串口、GPIO、I2C、SPI、Flash、以太网等）抽象成**统一设备对象（`rt_device`）**，对上用**统一接口**访问，对下由**驱动**实现具体操作。

  ### 设备模型（`struct rt_device`）
  - 头部是 `rt_object`（设备也是对象，带 `type`，如 `RT_Device_Class_Char`/`Block`/`Serial`...）。
  - **`ops`（操作函数集）**：`init`/`open`/`close`/`read`/`write`/`control`。
  - `user_data`、`parent`（继承 rt_device）、`type` 标识设备类别；设备可用 `rt_device_register` 注册、`rt_device_find` 按名查找、`rt_device_open/read/write/control/close` 使用。
  - **设备名**：如 `uart0`/`i2c1`/`spi0`，应用程序用名字 `rt_device_find` 拿到句柄再操作。

  ### 统一访问接口
  ```
  rt_device_find("uart0") → rt_device_open(dev, RT_DEVICE_OFLAG_RDWR)
    → rt_device_write(dev, pos, buf, len) / rt_device_read(...)
    → rt_device_control(dev, command, arg) // 设置波特率/校验等
    → rt_device_close(dev)
  ```
  - 这样上层**不关心具体芯片/外设**，只按“设备”的通用接口读/写，**驱动层按芯片实现**。

  ### 各类驱动框架
  - **串口（serial）**：`rt_hw_serial_register` 注册，支持中断/DMA/轮询模式；用户可用 `rt_device_open/read/write` 收发。
  - **I2C 框架**：`rt_i2c_bus`/`rt_i2c_client`，`rt_i2c_transfer` 收发；BSP 实现 `rt_hw_i2c` 底层。
  - **SPI 框架**：`rt_spi_bus`/`rt_spi_device`，`rt_spi_transfer`；支持片选、模式（CPOL/CPHA）。
  - **GPIO**：`rt_device` 基础上用引脚编号 `GET_PIN` 控制。
  - 其它：Flash、以太网（Ethernet）、CAN、看门狗、Sensor 等也有对应框架。

  ### 驱动分层（RT-Thread 风格）
  应用 → **设备接口**（open/read/...）→ **设备框架**（串口/I2C/SPI）→ **BSP/驱动**（操作寄存器/DMA/中断）。这样**换芯片只换 BSP 驱动，应用代码不动**。
why: |
  这一题考“**RT-Thread 为什么好移植/好复用**”。核心是**设备框架**：
  - **为什么有统一设备模型**：把“open/read/write/control”作为**通用抽象**，应用**只依赖设备接口**，不依赖具体外设/芯片 → **换芯片只改驱动**，应用层复用，这正是 RT-Thread 生态（BSP/驱动）强大的原因。
  - **为什么用设备名 `rt_device_find`**：按名字查设备，配合**自动初始化/设备树**，应用和框架**解耦**；调试也用 `list_device` 看已注册设备。
  - **与 FreeRTOS 对比**：FreeRTOS **没有标准设备框架**，通常靠社区组件或应用层各自封装；RT-Thread **内建**设备框架 + 串口/I2C/SPI 等驱动框架，天然“面向设备”编程。
---
<FlashCard />

## 深读

### 设备模型与 ops

```c
struct rt_device {
  struct rt_object parent;            // 设备也是对象
  enum rt_device_class_type type;     // 字符/块/串口/网络...
  rt_uint32_t device_flag;
  const struct rt_device_ops *ops;    // 操作函数集
  void *user_data;
  ...
};
// ops: init/open/close/read/write/control
```

### 分层调用链

```
[应用层] rt_device_open(write/read)        # 只按设备用
   ↓
[设备框架] 串口/字符/块设备框架            # 处理 open/read 的通用逻辑
   ↓
[驱动层/BSP] 具体芯片实现(寄存器/DMA/中断) # 换芯片只改这层
```

### 与 FreeRTOS 对比

| | FreeRTOS | RT-Thread |
|---|---|---|
| 设备抽象 | 无统一框架(靠组件/自写) | **内建设备框架 + 串口/I2C/SPI 等** |
| 访问接口 | 自定 | `rt_device_open/read/write/control` |
| 生态/移植 | 需自己搭 | BSP+驱动框架较完善 |
| 应用解耦 | 偏“直接操作外设” | 面向“设备”编程,易复用 |

### 工程场景

- **症状**：换了一块芯片，应用/外设代码要重写。
- **根因/对策**：没走**设备框架**、直接操作寄存器。改成 `rt_device_find/open/read/write/control`，只替换 **BSP 驱动**；用 `list_device`（msh/finsh）确认设备已注册。
- **注意**：`rt_device_open` 返回值要判断；`control`（如 `RT_DEVICE_CTRL_CONFIG`/波特率）要传对命令；DMA/中断模式要正确配置。

### 进阶追问链

1. **Q：设备框架解决了什么？** → 把外设抽象成“open/read/write/control 统一接口”，应用不再直接操作寄存器；换芯片只改驱动，提升可移植性与复用性。
2. **Q：为什么用设备名而不是地址？** → 按名 `rt_device_find` 解耦应用与驱动，配合自动初始化/设备树；也便于调试与裁剪。
3. **Q：RT-Thread 和 FreeRTOS 在驱动上的差别？** → RT-Thread 内建设备框架 + 串口/I2C/SPI 等驱动框架；FreeRTOS 无标准设备框架，通常靠组件或自封装。
4. **Q：写一个串口驱动要做什么？** → 实现 `rt_serial` 的 `ops`（init/configure/read/write/control），用 `rt_hw_serial_register` 注册到框架，配置串口硬件（时钟/GPIO/波特率/中断/DMA），之后应用就能用 `rt_device_*` 收发。

> 📌 一句话记忆：**RT-Thread 设备框架＝把外设抽象成 rt_device(对象,type + ops: init/open/close/read/write/control)，用 rt_device_find(名字)+open/read/write/control 统一访问；应用→设备框架→驱动/BSP 分层，换芯片只换驱动；串口/I2C/SPI 等有专门框架;FreeRTOS 没有这套标准设备模型。**
