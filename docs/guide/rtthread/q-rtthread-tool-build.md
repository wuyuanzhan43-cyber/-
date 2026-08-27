---
title: 开发工具（Studio / Env / 包管理器 / QEMU / 分析）
id: rtthread-tool-build
category: rtthread
difficulty: 4
tags: [RT-Thread, 工具, Studio, Env, 包管理器, QEMU, 调试]
company: [智驾, 大疆, 中兴]
keywords: RT-Thread Studio Env 包管理器 QEMU 调试 finsh 内存分析 性能分析
answer: |
  **结论先行**：RT-Thread 的“开发体验”靠一套工具链：**Studio（IDE）+ Env(scons/menuconfig) + 包管理器 + QEMU(无硬件调试) + finsh/msh(设备端命令行) + 内存/性能分析**。

  ### 工具全家桶
  | 工具 | 作用 |
  |---|---|
  | **RT-Thread Studio** | 图形化 IDE：配置/编译/下载/调试一体化 |
  | **Env** | 命令行工具：`menuconfig` 配置 + `scons` 编译（配 GNU 工具链） |
  | **包管理器** | 在线拉取组件/驱动/例程（`pkgs --update`/Studio 内） |
  | **QEMU** | **无真实硬件**也能跑/调试（`qemu-vexpress` 等），开发快 |
  | **finsh/msh** | 设备上的**命令行 shell**：`list_thread`/`list_device`/`list_timer`/`ifconfig`… |
  | **分析** | `list_memheap`/`free`（内存）、`xTaskGetRunTimeStats` 对应(内核统计)、性能分析 |

  ### 常用 finsh/msh 命令（调试利器）
  ```
  list_thread      # 线程、优先级、状态、栈、tick
  list_device      # 已注册设备
  list_timer       # 定时器
  list_memheap / free   # 内存使用
  ifconfig / ip_addr    # 网络(网卡 IP)
  ps / list     # 进程/对象
  ```

  ### 开发流程（Studio or Env 二选一）
  - **Studio**：新建工程 → 图形化配置 → 选组件 → 编译/下载/调试。
  - **Env**：`menuconfig` 配置 → `scons` 编译 → 用配套下载/调试工具烧录。

  ### 一句话
  **RT-Thread 开发＝Studio(图形化) 或 Env+menuconfig+scons(命令行) 配置编译 + 包管理器拉组件 + QEMU 无硬件调试 + finsh/msh 设备端命令 + 内存/性能分析。**
why: |
  这一题考“**RT-Thread 有没有像样的开发工具链**”，是“会不会用 RT-Thread”的直观体现，也是对比 FreeRTOS（多靠 Keil/自配）的优势：
  - **为什么有 Studio**：图形化，把**配置(menuconfig)/编译(scons)/下载/调试**一体化，**开箱即用**，降低上手门槛。
  - **为什么有 finsh/msh**：设备端**命令行 shell**，运行期间**查线程/设备/定时器/内存/网络**，**排错极快**——这是很多 RTOS 没有的。
  - **为什么有 QEMU**：**没硬件的同学/同事**也能跑起来调试/演示，**开发与培训友好**。
  - **为什么有包管理器**：组件/驱动/例程**在线拉取**，避免手搓集成。
  - **为什么看重分析**：嵌入式要抠内存/CPU，RT-Thread 提供 `list_memheap`/内核统计，便于定位资源问题。
  - 这一题答好，说明你不仅会用，还知道怎么**高效开发与排错**。
---
<FlashCard />

## 深读

### 两种开发流水线

```
[Studio 图形化]  新建工程 → menuconfig 图形配置(选组件/内核/BSP)
   → 编译 → 下载 → 调试(断点/查看线程) → 串口 finsh 交互
[Env 命令行]    menuconfig 配置(生成 rtconfig.h) → scons 编译
   → 用对应下载工具烧录 → 串口 msh 交互
```

### finsh/msh 常用命令

```
msh > list_thread   # 线程 优先级 状态 栈 剩余 tick
msh > list_device   # 设备
msh > list_timer    # 定时器
msh > list_memheap  # 内存堆
msh > free          # 内存使用
msh > ifconfig      # 网络(网卡 IP)
```

### 组件开关 / 配置项

- `RT_USING_FINSH`（shell）、`RT_USING_UTEST`（utest 测试框架）、`RT_USING_MEM_TRACE`（内存跟踪）、`RT_USING_CPU_USAGE`（CPU 占用）。

### 工程场景/坑

- **症状**：想看看“现在有几个线程、谁占内存/CPU、网卡 IP”却无从下手。
- **根因/对策**：没开 `RT_USING_FINSH`，或没连串口 msh。**开 finsh，用 `list_thread`/`list_device`/`list_memheap`/`ifconfig` 排错**，一目了然。想统计 CPU 用 `RT_USING_CPU_USAGE` + `ps`/相关命令。

### 进阶追问链

1. **Q：Studio 和 Env 区别？** → Studio 是图形化 IDE（配置/编译/下载/调试一体）；Env 是命令行配置编译（`menuconfig`+`scons`），配 GNU 工具链，偏“脚本/CI”。
2. **Q：finsh/msh 能干嘛？** → 设备端命令行：查线程/设备/定时器/内存/网络，运行期直接交互，极大利于排错与验证。
3. **Q：QEMU 的意义？** → 无真硬件也能跑/调试 RT-Thread，开发、演示、CI 友好；`qemu-vexpress` 等模拟。
4. **Q：怎么测内存/CPU？** → `list_memheap`/`free` 看内存；`RT_USING_CPU_USAGE` + 内核统计看 CPU；结合 `uxTaskGetStackHighWaterMark` 类高水位看栈。

> 📌 一句话记忆：**RT-Thread 开发工具＝Studio(图形化) 或 Env(menuconfig+scons) 配置编译 + 包管理器拉组件 + QEMU 无硬件调试 + finsh/msh 设备端命令(list_thread/list_device/list_memheap/ifconfig) + 内存/CPU 分析(RT_USING_CPU_USAGE)；开 finsh 排错最快。**
