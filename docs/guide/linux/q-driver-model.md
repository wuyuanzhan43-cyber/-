---
title: Linux 驱动模型三件套（bus/device/driver）
id: driver-model
category: linux
difficulty: 3
tags: [Linux, 驱动, 设备模型]
company: [海康威视, 中兴]
keywords: 驱动模型 bus device driver 匹配 platform probe 设备树
answer: |
  Linux 驱动模型核心是**三件套**：
  - **总线（bus）**：抽象设备与驱动之间的**连接**（`platform_bus`、`i2c`、`spi`、`usb` 等），负责**匹配**与**绑**。
  - **设备（device）**：内核里描述一个**具体硬件**的抽象（来自**设备树节点**或代码注册），包含寄存器/中断/时钟等资源。
  - **驱动（driver）**：描述“**我会驱动哪类设备**”（`compatible`/`id_table`）并提供 `probe`/`remove` 等回调，**驱动代码**。
  匹配机制：驱动注册时声明能匹配的 `compatible`（或 `id_table`），总线把它与设备节点匹配；匹配成功后调用 **`probe`** 完成初始化（申请资源、注册子设备、创建设备节点）。
  关系：**一条总线把驱动与设备“配对”，绑定后 `probe` 干活**。设备树正是**设备侧**的数据来源，驱动代码是**驱动侧**，两者**解耦**，实现“一内核适配多种板卡”。
why: |
  三件套让“**驱动与具体硬件解耦**”：驱动写“怎么驱动”，设备树/代码写“有哪些设备、在哪、什么资源”，总线负责**撮合**。这样的好处：**一套内核 + 多块板卡**（换 DTB 即可）、**热插拔**（设备上/下电自动匹配）、**模块化**（驱动可动态加载）。
  理解三件套，就能读懂驱动样例结构、为什么改板卡只需改设备树/匹配项，以及内核如何把设备树节点“变成”platform 设备再交给驱动。
---
<FlashCard />

## 深读

### 三件套关系图

```
        bus(platform_bus/i2c/spi...)
        ├── device   (来自设备树节点/代码)  --- 描述"有哪些设备、地址、中断、时钟"
        └── driver   (驱动代码)              --- 描述"我能驱动 compatible=xxx / id_table"
            匹配成功 -> 调用 probe() 完成初始化
```

### 匹配的两种路径

1. **设备树（of 匹配）**：设备节点 `compatible = "vendor,dev"`，驱动 `of_device_id` 里有相同 `compatible` → 匹配。
2. **ID 表（id_table）**：针对总线（如 `i2c_device_id`、`spi_device_id`），用 id 匹配。

### 一个 platform 驱动框架（结构）

```c
static const struct of_device_id my_dt_ids[] = {
  { .compatible = "vendor,my-dev" },
  {}
};

static int my_probe(struct platform_device *pdev){
  // 获取资源（ioremap/中断/时钟）, 注册字符设备或子系统
  return 0;
}
static int my_remove(struct platform_device *pdev){ ... }

static struct platform_driver my_driver = {
  .probe  = my_probe,
  .remove = my_remove,
  .driver = { .of_match_table = my_dt_ids },
};
module_platform_driver(my_driver);
```

### 为什么“一内核多板” / “热插拔”

- **设备侧**来自设备树/热插拔事件；**驱动侧**是通用驱动代码。
- 总线在**设备出现/驱动注册**时做**匹配**，成功即 `probe`；设备移除/驱动卸载则 `remove`。
- 所以：改板卡只换设备树（或修改设备节点），内核与驱动不变；插上 USB/PCIE 设备自动匹配驱动。

### 常见追问

- 设备树节点是怎么变成 platform device 的？——内核 `of_platform_populate` 解析 DTB，把匹配的节点注册为 **platform device**，之后与 platform driver 匹配。
- bus 到底在做什么？——维护设备与驱动的链表，做**匹配**，触发 `probe/remove`，并暴露 sysfs 结构（`/sys/bus/...`）。
- 没有设备树怎么描述设备？——代码里用 `platform_device_register` 等手动注册。

> 📌 一句话记忆：**总线撮合“设备树里的 device”与“驱动代码里的 driver”，匹配成功调 probe；device/driver 解耦 → 一内核多板、热插拔、模块化。**
