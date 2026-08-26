---
title: 设备模型与驱动开发（rt_device / ops 深挖）
id: rtthread-dev-model
category: rtthread
difficulty: 4
tags: [RT-Thread, 设备模型, 驱动开发, rt_device]
company: [大疆, 智驾, 汇顶]
keywords: RT-Thread rt_device 设备模型 ops 驱动开发 open/read/write/control 注册
answer: |
  **结论先行**：RT-Thread 的驱动开发 = “**实现一份设备操作（ops）+ 把设备注册进框架**”，应用层只按 `rt_device_find/open/read/write/control/close` 这套通用接口使用，不关心具体芯片。

  ### 1. 设备模型（`struct rt_device`）
  - 头部是 **`rt_object`**（设备也是对象），含 `type`（字符/块/串口/网络…）、`device_flag`、`user_data`。
  - **操作函数集 `ops`**：`init` / `open` / `close` / `read` / `write` / `control`，驱动主要就是填这几个函数指针。
  - `rt_device_register` 把设备按名字注册到框架；`rt_device_find("uart0")` 按名拿到句柄。

  ### 2. 一次“读”的完整链路
  ```
  rt_device_find("uart0") → rt_device_open(dev, RT_DEVICE_OFLAG_RDWR)
    → rt_device_read(dev, pos, buf, len)   // 或 write / control
    → rt_device_close(dev)
  ```
  上层只调通用接口；真正操作寄存器/DMA/中断的是**设备 ops 里对应的函数**。

  ### 3. 写一个驱动的步骤（教学）
  1. **定义设备实例**：`struct rt_serial_device`（或自定义 `rt_device`），填 `parent`(rt_device) 与 `ops`。
  2. **实现 ops**：如 `init`（开时钟/GPIO/配串口）、`configure`（波特率/校验）、`read`/`write`（收/发）、`control`（流控/缓冲区等）。
  3. **注册**：`rt_hw_serial_register(&device, "uart0", RT_DEVICE_FLAG_RDWR, &ops)`（串口用专门 API；自定义设备用 `rt_device_register`）。
  4. **（可选）RT-Thread 自动初始化**：用 `INIT_DEVICE_EXPORT` 让它在板级启动时自动注册。
  - 之后应用 `rt_device_find/open/read/write/control` 即可。

  ### 一句话
  **驱动 = 实现设备 ops（init/open/close/read/write/control）+ 注册到 rt_device 框架；应用只按通用接口用，换芯片只换驱动。**
why: |
  这一题是理解“RT-Thread 为什么好写驱动、好移植”的关键。核心**把“硬件差异”和“使用方式”解耦**：
  - **为什么用 ops 函数集**：把“怎么操作这个设备”封装成一组函数指针，框架/应用**只需调用抽象接口**，不接触寄存器。——这是**面向对象/接口**思想在 C 里的落地（设备也是对象）。
  - **为什么按名字 `rt_device_find`**：应用只依赖“设备名”，不依赖地址/类型，配合自动初始化/设备树，**驱动可替换、应用不动**。
  - **为什么分 init/open/close/read/write/control**：`init`(上电配置)、`open`(按模式打开)、`read/write`(收发)、`control`(控制/配置)、`close`(释放)——**生命周期清晰**，也便于框架做**缓冲/回调/管理**。
  - **顺带**：RT-Thread 的驱动是按“**框架里抽接口、BSP 里填实现**”组织，所以换芯片只需改 `ops` 实现，平台无关。
---
<FlashCard />

## 深读

### `struct rt_device` 与 `rt_device_ops`

```c
struct rt_device {
  struct rt_object parent;              // 设备也是对象
  enum rt_device_class_type type;       // Char/Block/Serial/Network...
  rt_uint32_t device_flag;              // 只读/只写/流等
  const struct rt_device_ops *ops;      // 操作函数集 ★
  void *user_data;
  void *rx_indicate, *tx_complete;      // 接收/发送完成回调
  ...
};
struct rt_device_ops {
  rt_err_t (*init)(struct rt_device *dev);
  rt_err_t (*open/close)(struct rt_device *dev, rt_uint16_t oflag);
  rt_err_t (*control)(struct rt_device *dev, int cmd, void *arg);
  rt_ssize_t(*read/write)(struct rt_device *dev, ...);
};
```

### 用一只 GPIO/串口驱动的“骨架”

```c
static struct rt_serial_device uart0_dev;
static rt_err_t uart0_configure(...){ /* 波特率/校验/数据位 */ }
static rt_err_t uart0_control(..., int cmd, void *arg){ /* 流控/缓冲 */ }
static int uart0_read(..., void *buf, rt_size_t size){ /* 从 FIFO/缓冲读 */ }
static int uart0_write(..., const void *buf, rt_size_t size){ /* 发 */ }

int uart0_init(void){
  // 开时钟/GPIO/中断, 并把 uart0_dev 注册进框架
  rt_hw_serial_register(&uart0_dev, "uart0", RT_DEVICE_FLAG_RDWR, NULL);
  return RT_EOK;
}
INIT_DEVICE_EXPORT(uart0_init);   // 板级启动自动注册
```

### 工程场景/坑

- **症状**：`rt_device_find` 找不到设备、或 `open` 失败、读不到数据。
- **根因/对策**：设备**没注册**（漏 `rt_device_register`/自动初始化）；`ops` 没实现全（如漏 `control`）；`open` 的模式标志没带对；波特率/GPIO 配置错。用 **`list_device`**（msh/finsh）确认设备已注册；对照 API 返回码 `RT_EBUSY`/`RT_EOK` 排错。

### 进阶追问链

1. **Q：为什么用 ops 函数指针而不是直接操作寄存器？** → 把“具体怎么操作”封装成接口，应用/框架只调抽象接口，实现硬件与使用解耦，便于换芯片/复用/模拟。
2. **Q：`rt_device_find` 为什么按名字？** → 用名字解耦应用与驱动实例；配合自动初始化/设备树，驱动可替换、应用不动；也方便调试（`list_device`）。
3. **Q：`init` 和 `open` 区别？** → `init` 是设备“上电/板级初始化”（开时钟、配置硬件），系统启动时做；`open` 是“按模式打开并可使用”（如按 `OFLAG_RDWR`），可能有缓冲/回调准备。
4. **Q：驱动如何实现“中断接收”？** → 设备在中断里收数据、通过 **`rt_device` 的 `rx_indicate` 回调**（或 `rt_hw_serial_isr`）通知框架/应用，应用可 `rt_device_read` 取；这样“收”不阻塞应用。

> 📌 一句话记忆：**RT-Thread 驱动开发＝实现 rt_device_ops(init/open/close/read/write/control)+rt_device_register 注册(可加 INIT_DEVICE_EXPORT 自动注册)；应用只按 rt_device_find(名字)/open/read/write/control 用；换芯片只改 ops 实现；用 list_device 排查设备是否注册。**
