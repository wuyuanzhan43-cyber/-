---
title: SPI Flash / 分区与文件系统承载
id: rtthread-flash
category: rtthread
difficulty: 4
tags: [RT-Thread, SPI Flash, 分区, 文件系统]
company: [大疆, 智驾, 海康威视]
keywords: RT-Thread SPI Flash 分区 文件系统 磨损均衡 FTL 读写擦
answer: |
  **结论先行**：SPI Flash 是**按“块/页”读写的非易失存储**，特点是**读快、写慢、按页写、擦除按块（先擦后写）且次数有限**。RT-Thread 用 **Flash 设备 + 分区表 + 文件系统**把它抽象成“文件”，上层像操作文件一样读写。

  ### Flash 三大特性（决定用法）
  - **读**：可按地址随意读，快。
  - **写**：按**页**写，且**只能把 bit 从 1 变 0**（写前需擦成 0xFF）。
  - **擦**：按**块（扇区）**擦，**擦除会把整块置 0xFF**；擦写次数有限（如 10 万次），需**磨损均衡（wear-leveling/FTL）**。

  ### RT-Thread 里的承载
  - **Flash 设备**：SPI Flash 注册成 Flash 设备（`rt_hw_spi_flash`/`rt_sfud` 等，SFUD=串行 Flash 通用驱动库）。
  - **分区（`rt_blk_dev`/分区）**：把 Flash 按地址划成**分区**（如 boot / app / data / 文件系统区），对应不同用途。
  - **文件系统**：在 Flash 上挂**文件系统**（`littlefs`/`elm-fatfs`/`romfs`/`ramfs`），由 **DFS** 统一抽象成本地 FS。
  - **挂载**：`dfs_mount(flash_partition, "/", "littlefs")` 把分区挂成根/目录，应用 `open/read/write` 即可。

  ### 时序与缓冲
  - 写前**先擦块**，再写页；数据要**按页对齐**（页大小常见 256B）。
  - 频繁/大量写用**文件系统**做缓冲 + FTL，内部处理**磨损均衡、掉电保护**。
why: |
  这一题教“**怎么把一块 Flash 变成可用的文件系统/存储**”，核心是理解 Flash 的**物理约束**：
  - **为什么要先擦后写**：Flash 位只能 1→0，写前必须擦成 0xFF；且**擦是按块**，所以**改一个字节也可能要擦一整块**——这是 Flash “写慢”的原因。
  - **为什么要分区**：把“**只读代码区**”“**可读写数据区**”“**文件系统区**”分离开，避免互相覆盖，也便于按区挂不同 FS。
  - **为什么用文件系统 + FTL**：Flash **擦写次数有限、需磨损均衡、掉电可能写坏**；文件系统（littlefs/fatfs）+ FTL 会做**磨损均衡、掉电保护、坏块管理**，应用只需按文件读写。
  - **为什么建议 littlefs 而一般不用 FAT 直接上 Flash**：FAT 面向块设备、更新页频繁易磨损且掉电易坏；**littlefs 是嵌入式小容量、掉电安全、磨损均衡**的专用文件系统。选型要匹配 Flash 特性。
  - 这一题答好，说明既懂 **Flash 物理限制**，又懂 **RT-Thread 的分区 → 挂载 → 文件** 整条链路。
---
<FlashCard />

## 深读

### Flash 读写/擦时序

```
读:  任意地址按需读(快)
写:  先擦块(整块→0xFF) → 再按 页(如256B) 写入
     (只能 1→0; 想改一定要先擦; 擦写次数有限)
擦:  按扇区/块, 一次置 0xFF
```

### RT-Thread 存储链路

```
[应用]   open/read/write 文件  (POSIX)
  ↓
[DFS]   虚拟文件系统 → 具体文件系统(littlefs/fatfs/romfs/ramfs)
  ↓
[挂载]  dfs_mount(flash分区, "/", "littlefs")
  ↓
[分区]  把 Flash 划成分区(boot/app/data/fs) → rt_blk_dev
  ↓
[Flash设备] SPI Flash(rt_hw_spi_flash / SFUD)  → 读写/擦
```

### 三种常用文件系统选择

| 文件系统 | 适用 | 特点 |
|---|---|---|
| **littlefs** | 嵌入式 Flash、小容量 | **掉电安全、磨损均衡、坏块管理**，推荐 on-flash |
| **elm-fatfs(FAT)** | 与 PC 兼容/大容量 | 兼容 FAT32，但为块设备设计、对 Flash 磨损大 |
| **romfs / ramfs / devfs** | 只读资源/内存/设备 | 轻、纯内存或只读 |

### 工程场景/坑

- **症状**：往 Flash 写文件后偶尔读不到/数据坏、或整块擦写太快寿命短。
- **根因/对策**：**没擦就写**；**页未对齐**；直接用 FAT 上 Flash 磨损大；没做分区隔离。
- **对策**：用**文件系统（littlefs）** + **分区**；写入**按页对齐**；避免频繁小写（用缓冲/日志）；必要时用 **SFUD** 统一驱动、**FlashDB** 做键值/日志。

### 进阶追问链

1. **Q：Flash 为什么要先擦后写？** → Flash 位只能 1→0，写入只能把“1 清成 0”，无法写回 1；所以写前必须把目标块擦成 0xFF。且擦是按**块**，改一字节也可能要擦整块。
2. **Q：为什么要分区？** → 把只读代码、可写数据、文件系统分离，避免互相覆盖；也便于按区挂不同 FS、做 OTA（boot/app 分区）。
3. **Q：littlefs 和 FAT 怎么选？** → 内存小、掉电安全、磨损均衡 → littlefs；需要和 PC 交互、或大容量 → FAT（但对 Flash 磨损大、掉电易坏）。
4. **Q：什么叫磨损均衡/FTL？** → Flash 擦写次数有限；文件系统/FTL 把写入分散到不同块、记录擦写次数，避免某块被写烂；掉电时用日志/副本保数据。

> 📌 一句话记忆：**SPI Flash＝读快、写按页、擦按块(先擦成0xFF、只能1→0)、擦写次数有限；RT-Thread 链路＝Flash设备(SFUD)→分区(rt_blk_dev)→文件系统(littlefs/fatfs/romfs/ramfs)→dfs_mount→应用 open/read/write；内嵌小容量优用 littlefs(掉电安全/磨损均衡)，大量小写用缓冲/FlashDB；写别忘擦与页对齐。**
