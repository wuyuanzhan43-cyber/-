---
title: Linux 系统启动流程（上电到应用）
id: boot
category: linux
difficulty: 3
tags: [Linux, 启动, uboot]
company: [海康威视, 大疆]
keywords: 启动流程 uboot bootloader 内核 设备树 rootfs init 应用
answer: |
  嵌入式 Linux 典型启动链路（上电 → 应用）：
  1. **ROM Bootloader**（芯片固化/一级启动）：上电后从固定地址读取，初始化基础时钟/DRAM，加载下一级 bootloader（如 SPL）。
  2. **Uboot/二级 Bootloader**：初始化外设（DDR、串口、网卡），加载**内核镜像 + 设备树(DTB)** 到内存，设置启动参数（bootargs），跳转到内核入口。
  3. **内核解压与初始化**：解压内核，建立页表/MMU，初始化内核子系统（内存管理、调度器、中断、驱动模型……），解析设备树并注册驱动。
  4. **挂载根文件系统**：内核根据 bootargs 挂载 rootfs，启动 **init 进程**（`/sbin/init`，常为 systemd 或 busybox init）。
  5. **用户态初始化**：init 读取配置文件，启动各服务与 Daemon，最终拉起应用/Shell。
  各阶段可通过**打印（早期 console）**、KDump、串口日志定位。
why: |
  这是嵌入式 Linux 系统的“**接力棒**”过程：每一级都只负责“把下一级准备好”。理解每一级做了什么、在哪个阶段出问题该查哪里，是内核/驱动工程师的基本功。
  bootloader（Uboot）负责硬件初始化和搬运；内核负责接管硬件并建立抽象；init 负责把用户态世界激活。
---
<FlashCard />

## 深读

### 分阶段速览

| 阶段 | 主要职责 | 常见内容 |
|---|---|---|
| ROM Boot/一级 | 最小初始化，加载下一级 | 固定地址、时钟/DDR 基本配置 |
| Uboot/Bootloader | 硬件初始化、加载内核+DTB | DDR/串口/网卡 init、环境变量 |
| 内核 | 建立抽象、设备模型、挂载根文件系统 | MMU、调度、中断、驱动、bus/device/driver 三件套 |
| init 进程 | 启动用户态 | systemd / busybox init、rcS |
| 应用 | 业务逻辑 | shell、APP、daemon |

### 内核启动的几个关键点

1. 内核入口先从汇编代码（`head.S`/`stext`）建立**页表与 MMU**，转到 C 语言 `start_kernel`。
2. `start_kernel` 初始化：`setup_arch`（解析 DTB/机器类型）、内存管理、`sched_init`（调度器）、`init_IRQ`（中断）、`vfs_caches_init` 等。
3. 之后调用 `rest_init` 起 `init` 线程，最终 `run_init_process` 启动用户态 init。
4. **设备树**在启动早期被内核解析为 platform 设备的树，用于注册驱动与设备。

### rootfs 怎么来

- `bootargs`（如 `root=/dev/mmcblk0p2 rootfstype=ext4`）告诉内核根文件系统在哪。
- 也可用 **initramfs**（拷贝进内核/内存的压缩 ramfs），常用于启动阶段或做“临时根”。
- 挂载成功后切换到真正的 rootfs，`pivot_root`/`switch_root`。

### 常见问题定位

- **完全开机没打印**：查电源/时钟/ROM boot/DDR 或串口 console 配置。
- **有 ROM 打印但卡在 Uboot 后**：查 Uboot 加载内核/DTB 是否成功、DDR 配置、分区表。
- **卡在内核早期**：查 console 参数、DTB 是否匹配、串口驱动是否早期支持。
- **卡在挂载 rootfs**：查分区/文件系统类型、内核是否包含对应驱动、bootargs。
- **能到用户态但应用起不来**：查 init 配置、依赖库、权限、日志。

### 常见追问

- 为什么内核是一级级加载？——芯片固化 ROM 很小、不灵活，让 Bootloader 负责灵活加载，分工明确。
- Uboot 与内核如何沟通？——通过**启动参数（bootargs）**、**设备树（DTB 里约定内存/设备）**、以及约定的内存地址。
- 能不能省掉 Uboot？——可以，用 UEFI/其它 bootloader 或直接裸 metal 启动；但普遍用 Uboot 灵活加载多种介质。

> 📌 一句话记忆：**ROM→Uboot→内核→rootfs→init→应用；每级只负责“准备好下一级”，出问题按阶段查打印。**
