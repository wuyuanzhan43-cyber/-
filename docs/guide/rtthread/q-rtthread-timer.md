---
title: RT-Thread 定时器（软/硬）与 tick
id: rtthread-timer
category: rtthread
difficulty: 4
tags: [RT-Thread, 定时器, tick, 时钟, 软定时器]
company: [智驾, 大疆, 中兴]
keywords: RT-Thread rt_timer 软定时器 硬定时器 rt_tick 定时器管理 超时回调
answer: |
  RT-Thread 定时器是基于 **tick** 的**软件定时器**（使用 `rt_timeout` 机制），把线程阻塞的时间、线程间定时都统一到**系统时钟（tick）**上。

  ### 定时器对象（`rt_timer`）
  - `rt_timer_create/init`、`rt_timer_start`、`rt_timer_stop`、`rt_timer_control`（改超时/周期）。
  - 属性**标志**：`RT_TIMER_FLAG_HARD_TIMER`（硬定时器）/`RT_TIMER_FLAG_SOFT_TIMER`（软定时器）+ `RT_TIMER_FLAG_ONE_SHOT`（单次）/`RT_TIMER_FLAG_PERIODIC`（周期）。
  - **超时回调**：定时器到期时执行的回调函数 `timeout`（在定时器线程/上下文里调用）。

  ### 软定时器 vs 硬定时器
  | 类型 | 超时回调在哪执行 | 特点 |
  |---|---|---|
  | **硬定时器** | **中断/钩子上下文**（默认，`RT_USING_TIMER_SOFT` 未开时） | 响应快，但回调里**不能阻塞** |
  | **软定时器** | **定时器线程**（`RT_TIMER_THREAD`，需 `RT_USING_TIMER_SOFT`） | 回调可做慢活（但仍是**软件**，非硬实时） |

  ### tick 与延时
  - `rt_tick_get()` 返回当前 tick；`rt_tick_increase()` 由**系统滴答**（如 SysTick/硬件定时器）在中断里被调用，推进系统时钟。
  - **线程延时/超时**和**定时器超时**都基于 tick 比较；内核维护**延时/超时链表**（按到期 tick 排序），tick 到期则唤醒等待线程/触发定时器回调。

  ### 配置
  - `RT_TICK_PER_SECOND`（tick 频率，如 1000=1ms 一拍）；`RT_USING_TIMER_SOFT`、`RT_TIMER_THREAD_PRIO`/`RT_TIMER_THREAD_STACK_SIZE` 等。
why: |
  这一题考“**RT-Thread 定时器怎么实现、软硬区别**”。核心：
  - **为什么有软/硬定时器**：**硬定时器**回调在**中断/时钟钩子**里执行，响应快但**不能阻塞**；**软定时器**回调在**专用定时器线程**里跑，能做较重工作（打印/慢处理），是**软件**的、非硬实时。这是 RT-Thread 相比其它 RTOS 比较显性的“定时器有两种”设计。
  - **为什么定时器基于 tick**：统一用**系统时钟**度量延时/超时/定时，避免每处自己维护；用**排序的延时/超时链表**保证“最早到期先处理”，tick 到期一次处理一批。
  - **为什么回调里别做重活**：硬定时器回调在中断上下文，重活会拖长中断（丢中断/破坏实时）；软定时器回调在定时器线程，重活会阻塞其它定时器（共享同一软定时器线程）。
  - 工程常**把定时器当“周期节拍/超时判断”**，重活仍应交线程。
---
<FlashCard />

## 深读

### 定时器对象与常用 API

```c
rt_timer_t t = rt_timer_create("t",           // 定时器名
    timeout_cb,                               // 超时回调
    NULL,                                     // 回调参数
    RT_TICK_PER_SECOND,                       // 超时 tick
    RT_TIMER_FLAG_PERIODIC);                  // 周期
rt_timer_start(t); rt_timer_stop(t); rt_timer_delete(t);
```
- `rt_timer_control(t, RT_TIMER_CTRL_SET_TIME, &timeout)` 改超时；`RT_TIMER_CTRL_GET_TIME` 取剩余。
- 回调注意：**硬定时器里不能阻塞/切线程**；软定时器里也别做得太久。

### tick 与超时链表

```
SysTick/硬件定时器中断
  → rt_tick_increase()          // tick++
  → 检查超时链表: 到期 tick 的线程/定时器
  → 唤醒线程(入就绪) / 执行定时器超时回调
  → (硬定时器回调在中断上下文; 软定时器入软定时器线程队列)
```

### 软/硬定时器如何实现

- **硬定时器**：超时回调**直接**在**定时器线程/或中断上下文**（取决于配置）执行；默认在系统时钟中断处理里有 `rt_tick_increase` → 触发到期。特点：快、但回调不能阻塞。
- **软定时器**：需 `RT_USING_TIMER_SOFT`，内核会创建一个或多个 **软件定时器线程**（`rt_thread`，如 `tidle`/`timer`），把到期软定时器回调**投到该线程**执行；可在其中做较长操作，但共享一个线程、别阻塞。

### 工程场景

- **症状**：定时器回调里做慢活，导致其它定时器/调度延迟；或在硬定时器回调里用阻塞 API。
- **根因/对策**：**硬定时器回调放“极短、原子”**；需要做重活/发通知+交给线程，用**软定时器**或**定时器里发事件（`rt_event_send`/`rt_mq_send`）**，由线程处理。

### 进阶追问链

1. **Q：软定时器和硬定时器区别？** → 硬定时器回调在中断/时钟上下文（快、不能阻塞）；软定时器回调在**软定时器线程**（能慢活，但共享、非硬实时）。用 `RT_TIMER_FLAG_SOFT_TIMER`/`RT_TIMER_FLAG_HARD_TIMER` 指定，需 `RT_USING_TIMER_SOFT`。
2. **Q：定时器回调能不能阻塞？** → **硬定时器不能阻塞**（在中断上下文）；软定时器也不建议阻塞太久（会卡住其它软定时器）。重活放线程。
3. **Q：`rt_tick_get` 和 `RT_TICK_PER_SECOND`？** → `rt_tick_get` 返回当前 tick；`RT_TICK_PER_SECOND` 设每秒 tick 数（如 1000=1ms）。延时/超时都用 tick 计量。
4. **Q：单次和周期定时器？** → `RT_TIMER_FLAG_ONE_SHOT` 只触发一次；`RT_TIMER_FLAG_PERIODIC` 周期触发（重复执行回调）。用 `rt_timer_start`/`rt_timer_stop` 控制。

> 📌 一句话记忆：**RT-Thread 定时器＝基于 tick 的软件定时器(rt_timer_create/start/stop/control)；超时回调分硬(中断/时钟上下文,快不能阻塞)与软(软定时器线程,RT_USING_TIMER_SOFT)；tick 由 rt_tick_increase 推进(RT_TICK_PER_SECOND)，延时/超时用排序链表按到期 tick 处理；回调别做重活，重活发事件交给线程。**
