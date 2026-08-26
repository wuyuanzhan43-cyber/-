---
title: 串口设备框架（中断/轮询/DMA、接收缓冲）
id: rtthread-serial
category: rtthread
difficulty: 4
tags: [RT-Thread, 串口, 设备框架, 驱动]
company: [大疆, 智驾, 海康威视]
keywords: RT-Thread 串口 rt_serial rt_hw_serial_register 接收缓冲 read/write 中断 DMA
answer: |
  **结论先行**：串口在 RT-Thread 里走**串口设备框架**——BSP 用 `rt_hw_serial_register` 把串口注册成 `rt_serial_device`，应用用 `rt_device_find/open/read/write/control` 收发，**不必直接碰寄存器**。

  ### 串口设备对象（`struct rt_serial_device`）
  - 头部是 `struct rt_device`（设备），扩展出**串口特有字段**（波特率/数据位/校验/流控、收发缓冲、模式）。
  - 通过 `rt_hw_serial_register(&uart, "uart0", flags, &ops)` 注册，`flags` 可带 `RT_DEVICE_FLAG_INT_RX`/`INT_TX`/`DMA_RX`/`DMA_TX` 等。

  ### 三种收发模式
  | 模式 | 特点 | 适用 |
  |---|---|---|
  | **轮询** | 阻塞忙等，简单 | 低频/调试 |
  | **中断** | 中断里收/发，配合缓冲，省 CPU | 常规数据流 |
  | **DMA** | 硬件 DMA 搬数据，CPU 几乎不干预 | 大流量/高速 |

  ### 应用层怎么用
  ```c
  rt_device_t uart = rt_device_find("uart0");
  rt_device_open(uart, RT_DEVICE_OFLAG_RDWR | RT_DEVICE_FLAG_INT_RX);
  rt_device_write(uart, 0, "hello", 5);          // 发
  rt_device_read(uart, 0, buf, len);             // 收(可阻塞/带回调)
  rt_device_control(uart, RT_DEVICE_CTRL_CONFIG, &config); // 设波特率等
  ```
  **重点**：接收常用**回调**——`rt_device_set_rx_indicate(uart, rx_callback)`，串口收到数据触发回调，应用再 `rt_device_read` 取；避免“轮询/阻塞等数据”。

  ### 驱动为什么要“缓冲 + 回调”
  - 收：中断把字节放进**接收缓冲**（环形缓冲），触发 `rx_indicate` 回调通知应用；应用从缓冲取，数据不丢、CPU 省。
  - 发：写进发送缓冲/触发 TX 中断或 DMA，`tx_complete` 回调通知写完成。

  ### 一句话
  **串口=注册成 rt_serial_device→应用 rt_device_find/open/read/write/control；接收用“中断入缓冲 + rx_indicate 回调通知应用取”，发送可用中断/DMA。**
why: |
  这一题教“**RT-Thread 怎么把“中断里收串口”这件事做得优雅**”，比裸机/SDK 直接写 ISR 省事得多：
  - **为什么用设备框架**：裸机写串口要自己管 GPIO/时钟/波特率/中断/缓冲区；RT-Thread 框架帮你**注册成设备、内置缓冲与回调**，应用只需 `rt_device_read/write`。
  - **为什么接收要“中断 + 缓冲 + 回调”**：串口是**异步**数据流，用**中断**收字节、入**环形缓冲**，避免“忙等/丢字节”；收到数据触发**回调**通知应用**再按需读**，既省 CPU 又不丢数据、不阻塞。
  - **为什么发可用 DMA**：大量/高速发数据时，DMA 搬走 CPU 不干预，收到 `tx_complete` 即完成。
  - **为什么这三种模式可切换**：`rt_device_open` 的 `oflag` 决定用轮询/中断/DMA——**同一套 API，模式是配置出来的**，这就是框架的价值。
---
<FlashCard />

## 深读

### 串口驱动骨架（BSP 侧）

```c
struct rt_serial_device uart0;                 // 串口设备对象(含 rt_device parent)
static struct serial_configure cfg = { 115200, 8BITS, PARITY_NONE, 1_STOP };
uart0.ops = &(struct rt_serial_ops){ .configure=uart_configure, .control=uart_control, .read=uart_read, .write=uart_write };
rt_hw_serial_register(&uart0, "uart0", RT_DEVICE_FLAG_RDWR | RT_DEVICE_FLAG_INT_RX, NULL);
// 中断里: rt_hw_serial_isr(&uart0, RT_SERIAL_EVENT_RX_IND) 通知框架有数据
```

### 应用侧“中断接收 + 回调”

```c
rt_device_t uart = rt_device_find("uart0");
rt_device_open(uart, RT_DEVICE_OFLAG_RDWR | RT_DEVICE_FLAG_INT_RX);
void on_rx(rt_device_t dev, rt_size_t size){  // rx_indicate 回调
  rt_device_read(dev, 0, buf, size);          // 取走刚到的数据
}
rt_device_set_rx_indicate(uart, on_rx);
```

### 三类收发模式对比（深入）

- **轮询**：`rt_device_read` 直接阻塞等待；省资源但**占 CPU/响应差**。
- **中断**：收字节进缓冲 + `rx_indicate` 回调；**不阻塞、省 CPU**，常规首选。
- **DMA**：`open` 带 `RT_DEVICE_FLAG_DMA_RX/TX`；数据由 DMA 搬，**最省 CPU、吞吐大**，适合高速/大包。

### 三处常见坑

1. **`rt_device_find` 找不到** → 串口没注册（漏 `rt_hw_serial_register` 或自动初始化）；用 `list_device` 查。
2. **收不到数据/抖** → `open` 的模式标志带对（`INT_RX`）；GPIO/波特率/复用配错；回调没 `rt_device_set_rx_indicate`。
3. **丢数据** → 接收缓冲太小/没及时 `read`；改用 DMA + 更大缓冲/分帧。

### 进阶追问链

1. **Q：串口接收为什么用回调而不是轮询/阻塞？** → 串口是异步数据流；回调（`rx_indicate`）在“有数据”时**通知应用再取**，避免忙等/占 CPU/丢字节，也不虚耗。轮询/阻塞适合低频或调试。
2. **Q：`rt_device_open` 的模式标志怎么选？** → 低频/调试用默认（轮询）；常规数据流用 `RT_DEVICE_FLAG_INT_RX`；高速大包用 `DMA_RX/TX`。模式决定“收/发怎么实现”，应用层 API 不变。
3. **Q：DMA 模式和中断模式的区别？** → DMA 由硬件直接搬数据（CPU 只在开始/完成时介入，`tx_complete`/`rx` 通知），省 CPU、吞吐大；中断是 CPU 逐字节/逐批处理。高速用 DMA，常规用中断。
4. **Q：串口驱动里 `rt_hw_serial_isr` 干什么？** → BSP 在**硬件中断里**调用它，把“串口有事件（收到数据/发送完成）”告诉框架，框架再决定触发 `rx_indicate` 回调或推进发送。它把“硬件事件”翻译成“框架事件”。

> 📌 一句话记忆：**RT-Thread 串口＝rt_hw_serial_register 注册成 rt_serial_device → 应用 rt_device_find/open(INT_RX/DMA)/read/write/control；接收走“中断入环形缓冲 + rx_indicate 回调通知应用取”，发送可用中断/DMA；模式用 oflag 配置、上层 API 不变；排除用 list_device 与 mode 标志。**
