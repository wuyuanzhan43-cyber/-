---
title: elm-fatfs（FAT 文件系统）
id: rtthread-fs-elmfat
category: rtthread
difficulty: 4
tags: [RT-Thread, 文件系统, elm-fatfs, FAT]
company: [智驾, 大疆, 海康威视]
keywords: RT-Thread elm-fatfs FAT32 文件系统 块设备 挂载 兼容
answer: |
  **结论先行**：**elm-fats**（ChaN 的 FatFs，RT-Thread 里常叫 `elm`）是一个**面向块设备、兼容 PC 的 FAT 文件系统**。RT-Thread 把**块设备（SD 卡/Flash 分区）挂成文件系统**后，应用就能用 `open/read/write` 访问，**文件还能在 PC 上直接读出**。

  ### 什么是“块设备”文件系统
  - **块设备**：按“**扇区/块**”读写（如 SD 卡 512B 扇区、Flash 页面），与“字符设备”（串口按字节）不同。
  - **FAT 文件系统的组织**：用 **FAT 表（文件分配表）+ 簇（cluster）链**记录文件占用了哪些块；`open/write` 实际是“**按簇顺序读写**”。
  - 因此 elm-fatfs 要作用在**块设备**上（`rt_block_dev`），例如 SD 卡、nor/nand Flash 上面的块设备。

  ### 在 RT-Thread 里挂载 FAT
  ```c
  // 1. 获得块设备(如 SD 卡)并初始化
  sd = rt_device_find("sd0"); rt_device_init(sd); rt_device_open(sd, ...);
  // 2. 挂载 FAT 到路径
  if (dfs_mount(sd, "/", "elm") == RT_EOK) { /* 挂载成功 */ }
  // 3. 应用读写
  int fd = open("/test.txt", O_CREAT|O_WRONLY); write(fd, buf, n); close(fd);
  ```

  ### 特点 / 适用
  - **兼容性好**：文件可在 PC（Windows/Linux）直接读写，适合“**要跟电脑交换数据**”、SD 卡/U 盘、日志导出。
  - **抽象为块设备**：坏块/磨损均衡通常由**上层（如 NAND FTL）或硬件**处理；FAT 本身面向“**块设备**”，对 Flash 的“先擦后写/磨损”不太友好（频繁小写损耗大）。
  - **容量**：支持 FAT12/16/32（选 `elm` 配置），适合**中小容量块设备**。

  ### 关键点 / 坑
  - **块设备要先初始化/挂载**：`dfs_mount` 返回必须判 `RT_EOK`；设备名要配对。
  - **挂载点路径**：挂到 `/` 或 `/data`，应用路径要与之对应。
  - **对 Flash 磨损**：直接上 Flash 会频繁擦写、容易磨损/掉电损坏——**内嵌 Flash 常用 littlefs，PC 兼容常用 FAT**。
why: |
  这一题教“**什么时候用 FAT 文件系统**”，核心是**取舍**：
  - **为什么用 FAT**：兼容性——文件能**拷到 PC**（U 盘/SD 卡/日志），是“**要和外界交换**”的刚需；且要求**块设备**之上。
  - **为什么不能随便把 FAT 放内嵌 Flash**：FAT 面向**块设备**，假设“可随机覆写、无磨损”；Flash 是“**先擦后写、擦写有限**”，FAT 频繁更新目录/FAT 表会**反复擦写、寿命差、掉电易坏**。所以**内嵌 Flash 用 littlefs**，**PC 交换用 FAT**。
  - **为什么叫 elm**：它是移植 **ChaN 的 FatFs**，RT-Thread 用 `elm` 关键字挂载。
  - **为什么需要块设备**：FAT 按**簇**存取，要求底层是“能按块读写”的介质，所以要先有块设备（SD、Flash 上的块设备）。
  - 这一题答好，说明明白“**文件系统是介质匹配的**”。
---
<FlashCard />

## 深读

### FAT 组织（教学简化）

```
[引导扇区] → [FAT表(文件分配表, 记录簇链)] → [根目录] → [数据区(簇)]
- 一个文件占若干“簇”, 用 FAT 表串成一个“簇链”
- open/read/write 实际是“按簇顺序读写”
- 目录项记录 文件名/首簇/大小/时间
```

### elm-fatfs 在 RT-Thread 的挂载

```
块设备(sd0/SD卡 或 Flash 分区)
  → rt_device_find/init/open(块设备)
  → dfs_mount(块设备, "/", "elm")   // 挂载 FAT
  → 应用 open("/file", ...) 读写
```
- 需要 `RT_USING_DFS_ELMFAT` 配置；`RT_DFS_ELM_*` 控制 FAT 类型/标签等。

### 适用 vs 不适用

| 场景 | 用 FAT(elm) | 用 littlefs |
|---|---|---|
| 与 PC 交换文件 | ✅ 首选 | ❌ |
| SD 卡/U 盘/大容量 | ✅ | ❌ |
| 内嵌 Flash(小、掉电敏感) | ❌(磨损/掉电) | ✅ |
| 需要掉电安全/磨损均衡 | ❌ | ✅ |
| 资源/临时(常只读) | ❌ | → romfs/ramfs |

### 工程场景/坑

- **症状**：挂载 FAT 后 open/write 失败，或文件在 PC 上能读但设备读不到。
- **根因/对策**：块设备没 init/open；`dfs_mount` 没判返回值；路径与挂载点对不上；FAT 类型/容量不匹配。用 `list_dir`/`dir`、`df`（finsh/msh）查；确认设备名(`list_device`)与配置。

### 进阶追问链

1. **Q：elm-fatfs 是什么？** → RT-Thread 里对 ChaN **FatFs** 的移植，关键字 `elm`，面向**块设备**、兼容 PC 的 **FAT 文件系统**。
2. **Q：为什么要块设备？** → FAT 按“簇”存取，底层要求能按块读写的介质（SD、Flash 上的块设备），不是字符设备。
3. **Q：FAT 和 littlefs 怎么选？** → 要 PC 兼容/U 盘/SD → FAT(elm)；内嵌 Flash、掉电安全/磨损均衡 → littlefs。
4. **Q：FAT 对 Flash 为什么不好？** → FAT 频繁更新目录/FAT 表，导致“先擦后写+擦写有限”的 Flash 反复擦写、寿命差、掉电易坏；所以内嵌 Flash 上 better 用 littlefs，FAT 留给 PC 交换/块设备。

> 📌 一句话记忆：**elm-fatfs = ChaN FatFs 移植(elm 关键字)，面向块设备(SD/Flash块设备)、按“FAT表+簇链”组织、兼容 PC(FAT12/16/32)；挂载＝rt_device 块设备 → dfs_mount(dev,"/","elm") → 应用 open/read/write；要 PC 交换用 FAT，内嵌 Flash 掉电敏感用 littlefs；挂载失败先查块设备 init/open 与路径。**
