---
title: RT-Thread 线程调度与就绪链表/优先级位图
id: rtthread-sched
category: rtthread
difficulty: 5
tags: [RT-Thread, 调度, 就绪链表, 位图]
company: [智驾, 大疆, 华为]
keywords: RT-Thread 调度 就绪链表 rt_thread_priority_table 优先级位图 __rt_ffs 时间片 抢占 O(1)
answer: |
  **RT-Thread 调度 = 固定优先级抢占 + 同优先级时间片轮转。** 一句话：始终选**就绪线程中优先级最高**的运行；同优先级按**时间片**轮流。

  ### 实现要点（O(1) 找最高优先）
  - **就绪链表数组**：`rt_thread_priority_table[RT_THREAD_PRIORITY_MAX]`，**每个优先级一条双向链表**，同优先级线程按其被就绪的先后入队。
  - **优先级位图**：`rt_thread_ready_priority_group`（`rt_ubase_t`，32 位，bit N=1 表示优先级 N 有就绪线程）。
  - **位扫描找最高优**：内核用 `__rt_ffs(...)`（Find First Set，等价于 Cortex-M `CLZ` 反用/前导找第一位）在**常数时间**内找到**最小的就绪优先级位**，从而 O(1) 拿到最高优先线程。
  - **抢占**：`rt_schedule()`（`rt_thread_yield`/超时唤醒/信号量释放等）把 `rt_current_thread` 与“最高就绪”比较，若后者优先级更高且是就绪，则**切换**（`rt_hw_context_switch`）。
  - **时间片**：线程结构里 `timeslice`（tick 计数值），时间片用完且同优先级有别的就绪线程 → 切换到下一个；`init_tick` 保存初始值。

  ### 配置
  - `RT_THREAD_PRIORITY_MAX`（默认 32），优先级**数值越小越高**（0 最高，`RT_THREAD_PRIORITY_MAX-1` 最低，常留给 idle）。
  - `RT_USING_TIMESLICE`（默认开启）同优先级时间片；`RT_USING_PREEMPTION` 抢占开关。
why: |
  这一题考“**RT-Thread 调度为什么是 O(1)**”。核心是**优先级位图 + 位扫描**：
  - **为什么用位图而不是遍历优先级**：32 优先级用一个 32 位整数记录“哪些优先级有就绪线程”，`__rt_ffs` 一条位扫描指令就找到**最高就绪优先**，**开销与线程/优先级数量无关**（O(1)）。
  - **为什么同优先级用时间片**：固定优先级抢占下，若多个同优先级线程，无时间片会让其中一个**霸占 CPU**；时间片轮转保证公平。
  - **为什么优先级数值越小越高**：RT-Thread 沿用“0 表示最高优先级”，`__rt_ffs` 找最小置位位即最高优先；与 STM32 中断“数值小=高”一致，但注意别和 FreeRTOS（数值大=高）搞混。
  理解“位图 + ffs + 就绪链表 + 时间片”，就能回答“为什么 O(1)、为什么同优先级会轮转、为什么优先级方向”。
---
<FlashCard />

## 深读

### 就绪数据结构

```
rt_thread_priority_table[优先级]: 每个优先级一条就绪线程链表
   [0]──最 高 优先──┐
   [1]              │  (线程按就绪先后入链表)
   ...              │
   [31]──最 低 优先──┘ (常为 idle 线程)

rt_thread_ready_priority_group: 32位位图
   bit N = 1 表示优先级 N 有就绪线程
```

### O(1) 选最高优先（源码近似）

```c
register rt_ubase_t highest_ready_priority;
rt_uint32_t number_mask;
highest_ready_priority = __rt_ffs(rt_thread_ready_priority_group); // 找第一个置位位=最高优先
number_mask = 1 << highest_ready_priority;
rt_thread = rt_list_entry(rt_thread_priority_table[highest_ready_priority].next,
                          struct rt_thread, tlist); // 取该优先级就绪链表头
```
- `__rt_ffs`：对 Cortex-M 用 `CLZ` 反算（`__CLZ(x)` 的 31-`__CLZ(x)`），找到**最低序号**的置位位。
- 核心：**常数时间**，不与线程数/优先级数成正比。

### 抢占切换路径

```
某事件让高优先级线程就绪(如 rt_sem_release 唤醒)
  → rt_schedule()
  → 比较 new_thread(current_thread)优先级
  → 若 new 更高且就绪 → rt_hw_context_switch(from,to)
  → 关中断, 切当前线程, 处理器上下文切换(汇编, 类似 PendSV), 恢复后开中断
```

### 时间片

- 线程被调度运行一段 tick 后，`thread->timeslice` 递减；到 0 时：
  - 若**同优先级还有其它就绪线程** → `rt_schedule()` 切换到同优先级下一个（时间片轮转）；
  - 否则**复位 timeslice** 继续跑（`rt_schedule` 里 `rt_timeout`/tick 处理）。
- `init_tick` 保存初始时间片，便于“用完就恢复”。

### 工程场景

- **症状**：高优先级线程“不跑”或同优先级线程轮流霸占。
- **根因/排查**：优先级方向搞反（值大=高，RT-Thread 相反）或某线程一直就绪无阻塞；时间片配置导致同优先级轮转不均；用 **`list_thread`**（msh/finsh）看每个线程的 **priority/state/timeslice/tick**。
- **对策**：确认优先级数值方向；给周期性任务正确 `rt_thread_delay`/`rt_sem_take` 让出；同优先级任务用合理时间片。

### 进阶追问链

1. **Q：RT-Thread 调度为什么 O(1)？** → 优先级位图 `rt_thread_ready_priority_group` + `__rt_ffs` 位扫描，一条指令找最高就绪优先级；再取该优先级就绪链表头线程，常数时间，不随线程数增长。
2. **Q：优先级数值越大越高还是越小越高？** → **越小越高**（0 最高，`RT_THREAD_PRIORITY_MAX-1` 最低，常给 idle）。这与 FreeRTOS（数值大=高）相反，别混淆。
3. **Q：同优先级为什么会时间片轮转？** → `RT_USING_TIMESLICE`，每线程 `timeslice` 个 tick；用尽且有同级就绪则切换。避免同优先级某线程霸占 CPU。
4. **Q：调度器什么时候触发？** → 线程主动让出（`rt_thread_yield`）、延时/阻塞到期（tick）、同步/通信唤醒（`rt_sem_release`/`rt_mq_send`）、中断里释放 IPC 后（`rt_thread_enter_critical`/`rt_schedule`）等。
5. **Q：idle 线程的作用？** → 最低优先级、无就绪线程时运行，做**系统空闲清理**（如删除已完成线程、tick 计数推进、空闲钩子），也是 CPU 占用测量的“空闲时间”来源。

> 📌 一句话记忆：**RT-Thread 调度＝固定优先级抢占 + 同级时间片；rt_thread_priority_table[] 按优先级就绪链表 + rt_thread_ready_priority_group 位图 + __rt_ffs 位扫描 O(1) 找最高优；优先级数值越小越高(0最高)，与 FreeRTOS(大=高)相反；idle 最低优先级兜底+空闲计数。**
