---
title: RT-Thread 启动流程与自动初始化（INIT_*_EXPORT）
id: rtthread-boot
category: rtthread
difficulty: 4
tags: [RT-Thread, 启动流程, 自动初始化, 组件]
company: [智驾, 大疆, 中兴]
keywords: RT-Thread 启动 自动初始化 INIT_BOARD_EXPORT rt_components_board_init $Sub$$main 组件初始化
answer: |
  **RT-Thread 启动靠“自动初始化”把大量组件/驱动按序装配**——这是它显著区别于 FreeRTOS（需手动初始化）的地方。

  ### 自动初始化机制
  - 用宏 **`INIT_BOARD_EXPORT`/`INIT_DEVICE_EXPORT`/`INIT_COMPONENT_EXPORT`/`INIT_ENV_EXPORT`/`INIT_APP_EXPORT`** 把函数**片段放到链接器特定段**（`rt_init_*.` 段，按**优先级/等级**）。
  - 启动时 **`rt_components_board_init()`** 扫描这些段，**按等级顺序调用**初始化函数，实现“**组件/驱动不用我手动调，进系统就自动初始化**”。

  ### 启动主流程（标准版）
  ```
  复位向量 → 硬件启动(建栈/拷data/清bss) → $Sub$$main (或 rt_hw_board_init)
    → rt_hw_board_init(): 时钟/串口/内存/定时器等板级初始化
    → rt_components_board_init(): 逐个调 INIT_*_EXPORT 段里的初始化函数
    → rt_system_timer_init() / rt_system_scheduler_init()   // 定时器+调度器
    → rt_application_init(): 创建应用线程(main thread 等)
    → rt_system_scheduler_start(): 启动调度器 → 高优先级线程开始跑
  ```

  ### 初始化等级（`INIT_*` 顺序）
  | 宏 | 阶段/说明 |
  |---|---|
  | `INIT_BOARD_EXPORT` | 板级（时钟/串口/内存）最先 |
  | `INIT_DEVICE_EXPORT` | 设备（驱动） |
  | `INIT_COMPONENT_EXPORT` | 组件（文件系统/网络等） |
  | `INIT_ENV_EXPORT` | 环境/上层 |
  | `INIT_APP_EXPORT` | 应用（最后） |

why: |
  这一题考“**RT-Thread 为什么开箱即用、组件怎么挂进去**”：
  - **为什么用段+回调自动初始化**：很多组件/驱动初始化不再依赖手工在 `main` 里逐个调，而是**链接器把函数“登记”到固定段**，`rt_components_board_init()` 按序扫描执行——**顺序有保证、可裁剪、易扩展**（加一个组件只需 `INIT_*_EXPORT`）。
  - **为什么用 `$Sub$$main`**：拦截 `main`，保证“**板级/组件初始化在用户 main 之前完成**”，用户 `main` 里直接用组件即可。
  - **与 FreeRTOS 的差异**：FreeRTOS 一般靠用户手动初始化各模块；RT-Thread 靠**自动初始化**减少样板，但也要求理解“**初始化顺序**”（板级→设备→组件→应用），否则设备未注册就使用会失败。
---
<FlashCard />

## 深读

### `INIT_*_EXPORT` 的链接器段机制（近似）

```c
#define INIT_EXPORT(fn, level) \
  const init_fn_t __rt_init_##fn SECTION(".rti_fn." level) = fn;
// 例: INIT_BOARD_EXPORT(fn) → 放进 ".rti_fn.0"  板级最先
//      INIT_APP_EXPORT(fn)   → 放进 ".rti_fn.5"  应用最后
// rt_components_board_init(): 扫描 .rti_fn.* 段, 按 level 从小到大依次调用
```
- 用**段的“序号/等级”**保证初始化**顺序**；同一等级按链接顺序。

### 使用示例

```c
static int my_driver_init(void){ /* 注册设备/初始化 */ }
INIT_DEVICE_EXPORT(my_driver_init);   // 设备级自动初始化
// 之后板级启动时自动调用, 无需在 main 里手动调
```

### 与 FreeRTOS 对照

| | FreeRTOS | RT-Thread |
|---|---|---|
| 组件初始化 | 常由用户手动 | `INIT_*_EXPORT` + `rt_components_board_init` 自动 |
| 顺序 | 用户自维护 | 段等级(板级→设备→组件→应用) |
| 扩展 | 手动挂 | 加一个宏即可 |
| 样板 | 多 | 更少 |

### 工程场景

- **症状**：设备/组件“没初始化就用了”失败，或初始化顺序错（设备没注册就 open）。
- **根因/对策**：用对**等级宏**（设备→`INIT_DEVICE_EXPORT`，组件→`INIT_COMPONENT_EXPORT`）；确认 `rt_components_board_init()` 已执行；看 `$Sub$$main` 是否正确接入。用 msh `list_device`/`list_thread` 确认设备/线程已就绪。

### 进阶追问链

1. **Q：自动初始化怎么实现的？** → 宏把初始化函数**放到链接器特定段**（`INIT_*_EXPORT` 按等级），启动时 `rt_components_board_init()` **按段等级顺序扫描调用**，实现组件按序自动初始化。
2. **Q：`$Sub$$main` 干什么？** → 拦截 `main`，在用户 `main` 之前完成板级/组件初始化（`rt_hw_board_init` + 自动初始化），用户 main 直接就能用组件。
3. **Q：`INIT_*` 的顺序如何保证？** → 不同等级对应**不同链接段**（`.rti_fn.0`~`.rti_fn.5`），扫描时按等级从小到大调；同一等级内按链接顺序。
4. **Q：和 FreeRTOS 的启动差异？** → FreeRTOS 常在 `main` 手动建任务/初始化；RT-Thread 靠**自动初始化**，`$Sub$$main` 拦 main、`rt_components_board_init` 自动装配，用户代码更少、更“开箱即用”。

> 📌 一句话记忆：**RT-Thread 启动＝复位→rt_hw_board_init(板级)→rt_components_board_init(扫描 INIT_BOARD/DEVICE/COMPONENT/ENV/APP_EXPORT 段按等级顺序初始化)→定时器/调度器初始化→rt_application_init→rt_system_scheduler_start；用 $Sub$$main 拦 main 保证初始化在用户 main 前；组件“加个宏即可注册、顺序自动”。**
