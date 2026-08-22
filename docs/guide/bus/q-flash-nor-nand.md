---
title: NOR vs NAND Flash
id: flash-nor-nand
category: bus
difficulty: 3
tags: [存储, Flash, NOR, NAND]
company: [联发科, 海康威视]
keywords: NOR NAND Flash 位寻址 随机读 坏块 磨损均衡 页擦除
answer: |
  **NOR Flash**：**可按字节/按位随机读**、可 XIP（在 Flash 上直接执行代码），读快、写慢、擦除粒度小、擦写寿命（约 1e5~1e6 次）通常**不低于** NAND、容量小（几 MB~几十 MB），成本高。适合**存固件/代码/启动代码**（Bootloader、Uboot）。
  **NAND Flash**：**按页读写、按块擦除**，**不能随机按字节读**、不能 XIP，**容量大、成本低、顺序/页吞吐快**（但**随机读慢、需页缓冲**）；正因**寿命有限**（SLC 约 1e5、MLC 约 1e4、TLC 约 3e3 次）+ **位翻转**，才需**坏块管理、ECC 纠错、磨损均衡**。适合**大容量数据/文件系统**（rootfs、存量数据、eMMC/SD）。
  区别核心：**NOR 可随机/位寻址、可 XIP，适合代码；NAND 块式、大容量、便宜但需管理，适合数据**。嵌入式常用：**NOR 存 Bootloader/固件 + NAND(或 eMMC/SD) 存文件系统/大容量数据**。
why: |
  两者**存储单元与访问方式**不同，导致“**可执行 vs 大容量**”的分工：NOR 的随机读与 XIP 让它能**直接跑代码**（掉电不丢、启动快）；NAND 的密度/成本优势让它是**大容量存储**的主流，但要额外处理**坏块、ECC、磨损均衡**、映射（NAND 通常经 NAND controller/MTD，或封装成 eMMC/SD 走块设备）。
---
<FlashCard />

## 深读

### 对照表

| 维度 | NOR | NAND |
|---|---|---|
| 访问单位 | 字节/位随机读 | 页读写、块擦除 |
| 随机读 | 快、可随机 | 慢、需页缓冲 |
| XIP(执行) | 支持（可跑代码） | 不支持 |
| 容量 | 小（MB 级） | 大（GB 级） |
| 成本 | 高 | 低 |
| 写/擦 | 慢、擦除粒度小 | 快、块擦除（大） |
| 寿命 | 较高（约 1e5~1e6 次，通常不低于 NAND） | 有限（SLC 1e5 / MLC 1e4 / TLC 3e3 次），需磨损均衡 |
| 管理与纠错 | 简单 | 需坏块+ECC+磨损均衡 |
| 典型用途 | 固件/启动代码 | 文件系统/大容量数据 |

### NOR 为什么能 XIP

NOR 的存储单元可**随机按位寻址**，CPU 能直接从 Flash 取指执行（XIP，Execute-In-Place），无需先拷到 RAM，启动快。所以 **Bootloader/UEFI/启动区**常用 NOR。

### NAND 为什么需要管理

- **坏块**：NAND 出厂有坏块，且会随擦写增多 → 需**坏块表/跳过**。
- **ECC**：NAND 位翻转概率高 → 需 **ECC 校验纠错**。
- **磨损均衡（wear-leveling）**：擦写次数有限（P/E cycles），要**均衡**避免某些块过早坏 → **FTL**（NAND 控制器/文件系统层处理）。
- **页/块结构与映射**：读写按页、擦除按块，需**地址映射**。

### 常见封装

| 介质 | 说明 |
|---|---|
| **eMMC** | NAND + 控制器（管理坏块/ECC/FTL），对外像块设备，嵌入式主流 |
| **SD/UFS** | 类似 eMMC，控制器管理 NAND |
| **SPI NOR** | 小容量 NOR，存固件/配置 |
| **NAND + MTD** | 裸 NAND 用 MTD 驱动管理，配 UBIFS 等 |

### 嵌入式怎么选

- **固件/Bootloader/启动镜像**：用 **NOR**（XIP、可靠）或 SPI NOR。
- **文件系统/大容量数据**：用 **eMMC/SD**（内置控制器、块设备）或 **NAND+MTD**。
- **性能/成本/容量/可靠性**综合权衡，现代嵌入式多倾向 **eMMC/UFS**（主控管理，省心）。

### 常见追问

- 为什么 NOR 能存代码而 NAND 不能？——NOR 可随机按位寻址、可 XIP；NAND 只能按页读、无随机执行能力。
- 为什么 NAND 更便宜但更难用？——密度高成本低，但要坏块/ECC/磨损均衡（FTL）。
- 开机时 Bootloader 常从哪来？——NOR（SPI NOR/并口 NOR），直接执行。
- eMMC 为什么好用？——控制器内置管理 NAND 的坏块/ECC/FTL，对外像块，软件省心。

> 📌 一句话记忆：**NOR=可随机读、可XIP、存代码；NAND=块式、大容量便宜但要坏块/ECC/磨损均衡，存数据；配 eMMC/SD 做数据，NOR 做启动代码。**
