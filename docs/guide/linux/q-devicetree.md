---
title: 设备树（Device Tree）的作用
id: devicetree
category: linux
difficulty: 3
tags: [Linux, 设备树, DTS, DTB]
company: [海康威视, 联发科]
keywords: 设备树 DTS DTB device-tree 描述硬件 板级 设备驱动分离
answer: |
  **设备树（Device Tree）**是一种**用树形结构描述硬件**的数据文件（DTS 源码 → DTC 编译 → DTB 二进制），让内核启动时知道“有哪些设备、挂在哪个总线、用什么寄存器/中断/时钟、板子上怎么连接”。
  它把“**板级/硬件描述**”从内核源码里抽出来，使**同一份内核可以适配多种板卡**（只需换 DTB），实现“**设备与驱动分离**”。
  核心作用：内核在启动早期解析 DTB，生成 **platform device（平台设备）树**，然后与驱动里的 **platform driver** 通过 **compatible 匹配**（也有 of_match_table），从而调用 `probe` 完成初始化。
  常用在 ARM 等非 x86 平台（PC 用的 ACPI/BIOS 负责相似职责）。
why: |
  在设备树之前，ARM 社区硬编码大量板级信息到内核（mach-XXX），每块板卡都要改内核源码，维护与分发极其困难、内核臃肿。
  设备树把“硬件描述”外置为**一个可替换的数据文件**：内核变得**与板卡解耦**，驱动只认“某种设备（compatible）”，而“具体哪个设备、连在哪、什么地址”由 DTB 描述。一张内核镜像 + 一块 DTB = 适配一块板。
---
<FlashCard />

## 深读

### 设备树三段式

| 阶段 | 文件 | 说明 |
|---|---|---|
| DTS（源码） | `xxx.dts` / `xxx.dtsi`（include 公共部分） | 人类可读的树形描述 |
| DTC（编译器） | `dtc` | 把 DTS 编译成二进制 |
| DTB（二进制） | `xxx.dtb` | 内核实际解析的对象，可反编译成 DTS（`dtc -I dtb -O dts`） |

### 结构示例

```dts
/ {
  model = "MyBoard";
  compatible = "vendor,myboard";
  memory { device_type = "memory"; reg = <0x80000000 0x1000000>; };
  soc {
    uart0: serial@ff0c0000 {
      compatible = "vendor,my-uart";
      reg = <0xff0c0000 0x1000>;
      interrupts = <0 32 4>;
      clock-frequency = <24000000>;
    };
  };
};
```

内核从该节点读出：寄存器地址、中断号、时钟等，从而**无需硬编码**即可初始化 `uart0`。

### 内核如何用 DTB

1. Bootloader 把 DTB 地址传给内核（寄存器/参数）。
2. 内核 `setup_arch` 解析 DTB，建立内存与机器信息。
3. **`of_platform_populate`** 把 DT 节点转成 **platform device**。
4. 驱动注册 **platform_driver**，通过 `compatible` 匹配（`of_match_table`）命中后调用 **`probe`** 初始化设备。

### 与“设备-驱动-总线”模型的关系

Linux 设备模型是 **bus / device / driver 三件套**：

- **platform bus**：把挂在片上总线的设备抽象出来。
- **device**：来自设备树节点。
- **driver**：驱动代码里注册，说明“我能驱动什么”（compatible）。
- 两者匹配后绑定，调用 `probe`。

设备树正是 **device 侧的数据来源**，而驱动代码是 **driver 侧**。两者解耦即可“一个内核配多种硬件”。

### 常见追问

- 设备树和 ACPI/BIOS 什么关系？——PC 用 ACPI/BIOS，ARM（及不少嵌入平台）用设备树；各自描述硬件，让内核少硬编码。
- 没有设备树能跑吗？——可以，但往往要大量板级硬编码（如旧 ARM mach-XXX），不如 DT 灵活。
- 改板卡要重编内核吗？——只改/换 DTB 即可，内核只需包含对应驱动；这就是“产物分离”的收益。
- DTS 和 DTSI 的区别？——`.dtsi` 是可 include 的公共片段（如 SoC 定义），`.dts` 是具体板级覆盖。

> 📌 一句话记忆：**设备树 = 外置的“硬件清单/连线图”，让内核与板卡解耦；compatible 匹配把 DT 设备“交给”对应驱动。**
