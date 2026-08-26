---
title: 任务栈溢出怎么排查、有什么工具
id: stack-overflow-debug
category: rtos
difficulty: 4
tags: [RTOS, 栈溢出, 调试, 高水位]
company: [汇顶, 海康威视, 汽车电子]
keywords: 栈溢出 高水位 uxTaskGetStackHighWaterMark 0xa5 vTaskList 排查 工具
answer: |
  **结合 Q11（检测机制）+ Q21（HardFault 分析）排查任务栈溢出**，主线是"**确认哪个任务溢出 → 找到吃掉栈的调用 → 增大/优化**"。

  **排查方法**：
  1. **开启栈检测 + 钩子**：`configCHECK_FOR_STACK_OVERFLOW=2`（越界检查），任务创建时把栈**填 `0xa5`**，在 `vApplicationStackOverflowHook` 里**打印/记录是哪个任务溢出**（用 `pcTaskName` / `uxTaskGetStackHighWaterMark`）。
  2. **看高水位（最大栈用量）**：`uxTaskGetStackHighWaterMark(handle)` 返回该任务**自创建以来剩余最少栈空间**；**越接近 0 越危险**。这是最直接的量化指标。
  3. **`vTaskList` / `vTaskGetRunTimeStats`**：打印每个任务的**栈大小、剩余、状态、优先级**，一眼看出哪个任务栈紧张。
  4. **增大栈验证**：临时把 `usStackDepth` 调大，若不再崩 = 是该任务栈配小/调用深。
  5. **静态分析/编译器**：GCC `-fstack-usage`、Keil 的 **Stack Usage**、MISRA 报告，估算最坏调用深度。
  6. **调试器**：SWD/IDE 看**当前 SP 是否越过 `pxStack`**、看栈边界附近内存是否被写（`0xa5` 是否被破坏）。

  **找元凶**：**深递归、超大局部数组、`printf`/浮点/`malloc` 等库栈消耗、任务栈配太小**。
why: |
  栈溢出**难复现**（偶发、跨任务污染），所以要靠**量化**而非"猜"。核心工具是**高水位 `uxTaskGetStackHighWaterMark`**：
  - 它回放"**任务自创建以来最大的栈压力**"，比"崩了才看"前移——能在**溢出前**就发现该任务栈快用完了。
  - **为什么填 `0xa5` 并看"变化区"**：没被写到的区域保持 `0xa5`，**剩余空间 = 未变化区大小**，即"剩余栈"；被写坏到边界 = 已溢出。
  - **为什么看调用深度/库消耗**：真实栈压在很多是**深调用、大局部数组、库（`printf` 常吃几 KB）**，只靠"调大栈"是治标；要**减少调用深度/把大数组放堆/换轻量库**才治本。
---
<FlashCard />

## 深读

### 排查流程（从症状到根因）

```
症状: 偶发崩/HardFault/数据互洗/跑飞
 ├─ 1 开 configCHECK_FOR_STACK_OVERFLOW=2 + 0xa5 填栈
 │    → vApplicationStackOverflowHook 记录哪个任务溢出
 ├─ 2 uxTaskGetStackHighWaterMark(handle) 看剩余栈
 │    → 近 0 = 该任务栈快爆
 ├─ 3 vTaskList 看各任务栈大小/剩余/状态
 ├─ 4 调大 usStackDepth 验证是否还崩
 ├─ 5 编译器 -fstack-usage / KEIL StackUsage 分析
 └─ 6 SWD断点, 看 SP 越过 pxStack / 边界 0xa5 被写坏
```

### 关键工具清单

| 工具 | 看什么 | 用法 |
|---|---|---|
| `uxTaskGetStackHighWaterMark` | 剩余最少栈空间 | 任务运行后调用，近 0 危险 |
| `vTaskList` / `vTaskGetRunTimeStats` | 每任务栈大小/剩余/CPU | `configUSE_TRACE_FACILITY`+`configUSE_STATS_FORMATTING_FUNCTIONS` |
| `vApplicationStackOverflowHook` | 哪个任务溢出 | 检测溢出时打印/记录 |
| `-fstack-usage` (GCC) | 静态调用深度估算 | 编译选项；KEIL 有对应 Stack Usage |
| SWD/IDE 内存查看 | 栈边界是否被写 | 断点处看 SP/`pxStack`、边界 `0xa5` 是否破坏 |

### 高水位怎么用（示例）

```c
void printStackWaterMark(TaskHandle_t h, const char *name) {
  UBaseType_t words = uxTaskGetStackHighWaterMark(h); // 剩余最少栈(字节)
  // 越接近 0 越危险；可对比任务栈总大小判断余量
}
```

### 常见追问

- **Q：为什么栈溢出难以稳定复现？**
  A：溢出只在实际调用深度最深、且恰好写坏相邻重要内存时才崩，取决于**调用路径与时序**，偶发。所以要用**高水位 + 0xa5** 主动量化，而不是等崩了再查。

- **Q：`uxTaskGetStackHighWaterMark` 返回值越大越好吗？**
  A：是。它表示**剩余栈**；**数值越小越危险**（越接近 0 表示栈越接近被用尽）。所以要保证它**始终保持一个合理安全余量**。

- **Q：元凶是 `printf` 深调用，怎么改？**
  A：**减小缓冲/用轻量 printf（如 `tiny printf`）**、把**大局部数组放堆/静态区**、**限制递归深度**、或**直接增任务栈**作为兜底；本质是**控制单任务最大栈压**。

> 📌 一句话记忆：**栈溢出排查＝开configCHECK_FOR_STACK_OVERFLOW=2+0xa5→ vApplicationStackOverflowHook定位任务→ uxTaskGetStackHighWaterMark看剩余栈(近0危险)→ vTaskList各任务栈→ 调大栈验证→ -fstack-usage/IDE分析；元凶是深递归/大局部数组/printf等库栈消耗/栈配太小。**
