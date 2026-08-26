---
title: RTOS 运行时 CPU 占用率怎么测量
id: cpu-usage-measure
category: rtos
difficulty: 4
tags: [RTOS, CPU占用, 监控, 调试]
company: [大疆, 智驾, 海康威视]
keywords: CPU占用率 空闲任务 计数 IdleHook xTaskGetRunTimeStats CYCCNT DWT 测量
answer: |
  **原理**：CPU 占用率 = (总时间 - 空闲时间) / 总时间。RTOS 里**空闲任务（Idle）只在没有其它任务/中断要跑时才运行**，所以统计**Idle 任务运行的时间**，就能反推出 CPU 占用率。

  ### 常见方法
  1. **Idle 钩子计数法**（最简单）：`configUSE_IDLE_HOOK=1`，在 `vApplicationIdleHook` 里对**计数器**累加；在定时器/高优先级任务里周期采样：
     `占用率 ≈ 1 - (本周期 Idle 计数增量 / 周期内总计数)`。
  2. **高精度时基**：用 **CMSIS `DWT->CYCCNT`**（CPU 周期计数器）统计**Idle 期间的 CPU 周期数**，除以总周期数，得到**精确占用率**；或用 `xTaskGetTickCount` 配合。
  3. **FreeRTOS 运行时统计**：`configGENERATE_RUN_TIME_STATS=1` + 定时器统计（`portGET_RUN_TIME_COUNTER_VALUE`），用 **`vTaskGetRunTimeStats`** 打印**每个任务占用 CPU 的百分比与时间**。
  4. **`vTaskList` / `uxTaskGetSystemState`**：任务级 CPU 时间、栈、状态一览。
  5. **可视化工具**：**SEGGER SystemView / Tracealyzer** 等**实时跟踪**，看 CPU 负载、调度、任务时间线。

  ### 注意
  **ISR 时间也计入占用**（Idle 不跑时含任务 + 中断）；别把占用率当"各任务时间片比例简单叠加"；空闲计数在 Idle hook 里要**独占/关调度**，避免并发计数错误。
why: |
  面试/工程都关心"**系统还有没有余量、哪个任务最吃 CPU**"。原理很朴素：**Idle 任务只在 CPU 完全空闲时才跑**，所以**Idle 的时间 = 系统空闲量**，用"总时间减空闲"即可得占用。
  - **为什么用 DWT `CYCCNT` 而非 tick**：tick 粒度粗（如 1ms），统计不准；**DWT 按 CPU 周期计**，能精确到单周期，适合高精度占用测量。
  - **为什么 `xTaskGetRunTimeStats` 更全**：它基于**每个任务累计的运行时间**，能直接给出"哪个任务占多少 CPU"，比只测空闲更细。
  - **为什么 ISR 也算**：占用率应反映"CPU 有没有被用得真**忙**"，**中断执行也占 CPU**；只测空闲任务无法区分"任务忙"还是"中断忙"，但占用率本身包含二者（空闲不跑 = 忙）。
---
<FlashCard />

## 深读

### 占用率测量（Idle 计数法可视化）

```
[一个测量周期 T]
 总时间 T            = 空闲时间 + 忙碌时间(任务+中断)
 CPU占用率 = 忙碌时间 / T = 1 - (空闲时间 / T)

Idle 任务只在"没有任何任务/中断要跑"时运行
 → 统计 Idle 运行时间(计数) = 系统空闲量
 → 占用率 = 1 - Idle时间/T
```

### 方法对比

| 方法 | 原理 | 精度 | 说明 |
|---|---|---|---|
| Idle 钩子计数 | Idle 里计数 | 中 | 最简单，`configUSE_IDLE_HOOK` |
| DWT `CYCCNT` | CPU 周期计数 | 高 | 精确到周期，需启用 DWT |
| `xTaskGetRunTimeStats` | 每任务累计时间 | 中 | 需 `configGENERATE_RUN_TIME_STATS` |
| SystemView/Tracealyzer | 可视化跟踪 | 高 | 看任务时间线、负载 |

### 源码级：DWT `CYCCNT`（高精度）

```c
void dwt_init(void){ CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk; DWT->CYCCNT=0; DWT->CTRL|=1; }
// 用 CYCCNT 计空闲周期:
// 在 Idle hook 里: idle_cycles += DWT->CYCCNT - last; last = DWT->CYCCNT;
// 采样时: cpu = 100*(total - idle)/total;
```
- `DWT->CYCCNT` 每 CPU 周期加 1，需开 `DEMCR.TRCENA` + `CTRL.CYCCNTENA`。适合精确测一段代码/一个周期的 CPU 占用。

### FreeRTOS 运行时统计配置

```c
#define configGENERATE_RUN_TIME_STATS 1
#define portGET_RUN_TIME_COUNTER_VALUE()  DWT->CYCCNT   // 高精度计数源
void vApplicationGetIdleTaskMemory(...);                  // 可配
// 用 vTaskGetRunTimeStats() 打印各任务 CPU 百分比/时间
```
- 用 **高精度时基**（如 DWT `CYCCNT`）作为统计计数源，`vTaskGetRunTimeStats` 给出**每个任务占用 CPU 的百分比**。

### 工程场景

- **症状**：系统"很忙"但不知道哪个任务最吃 CPU、或某任务长期霸占。
- **根因/排查**：用 `xTaskGetRunTimeStats` 看任务级占比；用 `vTaskList` 看状态/栈；识别**忙等任务**（一直 READY/RUNNING）。
- **对策**：优化的任务（忙等→阻塞/延时）、降采样、分散负载；把长 ISR/重活搬出。

### 进阶追问链

1. **Q：为什么用空闲任务来算占用？** → 因为它只在 CPU 空闲时运行，空闲率=空闲运行时间/总时间，占用率=1-空闲率。这是 RTOS 里最不依赖硬件的测量思路。
2. **Q：ISR 时间算占用吗？** → 算。CPU 占用应反映"忙碌"，中断执行也占 CPU。测量时如果只看"任务运行"会漏掉中断开销；用空闲任务计数法（空闲不跑=包含任务与中断在内的忙碌）则天然包含。
3. **Q：怎么看到"哪个任务最耗 CPU"？** → 用 `vTaskGetRunTimeStats`/`vTaskList` 看各任务累计运行时间与占比；或 SystemView 看任务时间线。对找性能瓶颈、评估调度余量很有用。
4. **Q：Idle hook 里计数要注意什么？** → 要**独占/关调度**（`vTaskSuspendAll`）避免并发计数错乱；别在 Idle hook 里做重活（Idle 是低优先级、还被用来回收已删任务、喂看门狗等）。

> 📌 一句话记忆：**CPU占用率=1-空闲时间/总时间；RTOS用Idle任务监测：Idle钩子计数或DWT CYCCNT精确计空闲周期；要"哪个任务耗CPU"用 xTaskGetRunTimeStats(需configGENERATE_RUN_TIME_STATS+cyccnt时基)/vTaskList；ISR也算占用；可视化用SystemView/Tracealyzer。**
