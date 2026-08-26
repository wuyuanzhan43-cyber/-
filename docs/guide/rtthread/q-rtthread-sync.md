---
title: RT-Thread 同步：信号量/互斥锁/事件集
id: rtthread-sync
category: rtthread
difficulty: 4
tags: [RT-Thread, 信号量, 互斥锁, 事件集, 同步]
company: [大疆, 智驾, 华为]
keywords: RT-Thread rt_sem rt_mutex rt_event 信号量 互斥锁 事件集 优先级继承 同步
answer: |
  RT-Thread 的**线程间同步**主要有三种对象（都是 `rt_object`）：**信号量（`rt_sem`）、互斥锁（`rt_mutex`）、事件集（`rt_event`）**。

  ### 信号量（`rt_semaphore`）
  - 计数型（二值/计数），`rt_sem_create/init`、`rt_sem_take`（可超时）、`rt_sem_release`。
  - **无所有权、无优先级继承**；用于**事件/资源计数/任务同步**。
  - 中断里可 `rt_sem_release`（ISR 安全）。

  ### 互斥锁（`rt_mutex`）
  - **有所有权**（只能由持锁线程释放），`rt_mutex_take/release`。
  - **自带优先级继承**：高优先级线程等锁时，把持锁的低优先级线程**临时提级**，避免优先级反转；释放后恢复初始优先级。
  - 用于**资源独占/临界区**保护；**不能进中断**。

  ### 事件集（`rt_event`，RT-Thread 特色）
  - **32 位事件标志**，`rt_event_send`（置位/清位），`rt_event_recv`（等待若干位，支持“**与/或**”逻辑 + `RT_WAITING` + 超时）。
  - 适合“**一个线程等多个事件同时/任一满足**”，比信号量更原子、更灵活（一个事件可唤醒多个条件）。

  ### 怎么选
  - **资源计数/事件发生/同步** → 信号量。
  - **保护共享资源（禁止并发写）+ 需继承** → 互斥锁。
  - **一个线程等“多个条件组合”** → 事件集。
why: |
  这题考“RT-Thread 同步三件套”的**语义区别**，尤其事件集是 RT-Thread 相比 FreeRTOS（FreeRTOS 没有内建“与/或”事件集，只有事件组需额外配置）比较有特色的：
  - **信号量 vs 互斥锁**：所有权 + 优先级继承——互斥锁是“资源独占（只能一人）/可继承”，信号量是“事件/计数（谁都能踢一脚）”。信号量**无继承**，用它保护资源会**优先级反转**。
  - **事件集 vs 信号量**：事件集是 **32 位一组标志**，能“**按位等待**”，且**一次唤醒可满足“所有/任一”条件**；信号量通常一次只表达“一件事”。做“多事件无响应/复杂时序”用事件集更自然。
  - 这一题也补全“RT-Thread 为什么 IPC 齐全”的认知——三种同步各有定位。
---
<FlashCard />

## 深读

### 三种同步对比

| 维度 | 信号量 | 互斥锁 | 事件集 |
|---|---|---|---|
| 语义 | 事件/计数 | 资源独占 | 多事件标志(32位) |
| 所有权 | 无 | **有**(同线程释放) | 无 |
| 优先级继承 | ❌ | ✅ | ❌ |
| 中断里 | ✅ `rt_sem_release` | ❌ | ✅ `rt_event_send` |
| 等待逻辑 | 1 件事 | 独占一个资源 | 多条件(与/或) |
| 典型 | 唤醒/计数 | 保护共享资源 | 一个线程等若干事件组合 |

### 源码/对象要点

```c
// 互斥锁含“持有者”与“继承”
struct rt_mutex {
  struct rt_object parent;
  rt_uint16_t     priority;     // 天花板/优先级
  rt_list_t       suspend_thread; // 等待者链表
  ...
};
// 事件集: 32 位标志
struct rt_event {
  struct rt_object parent;
  rt_uint32_t     set;   // 事件标志
  ...
};
```

- **互斥锁优先级继承**：RT-Thread 用 `rt_thread_priority_change`/`rt_mutex_priority_inherit`，当 `rt_mutex_take` 让高优先级线程等待时，把**当前持锁线程**优先级临时提上来；`rt_mutex_release` 恢复。
- **事件集**：`rt_event_send(evt, 0x01)` 置位；`rt_event_recv(evt, 0x03, RT_EVENT_FLAG_AND|RT_EVENT_FLAG_CLEAR,...)` 等待 bit0&bit1 且清位。

### 优先级继承示例（互斥锁避免反转）

```
H(高) 等 M 锁; L(低) 持锁 → RT-Thread 临时把 L 提到 H 级
→ L 能抢在 M(中) 前 → 尽快释放锁 → 恢复 L 初始优先级
→ 避免“高优先级 H 被中优先级 M 拖住”(优先级反转)
```

### 工程场景

- **症状**：用信号量保护共享资源后，高优先级任务响应变慢（反转）；或一个线程等不到“综合条件”满足。
- **根因/对策**：保护资源用**互斥锁**（带继承），别用信号量；多条件时序用**事件集**；中断里释放用 `rt_sem_release`/`rt_event_send`（ISR 安全），绝不用 `rt_mutex_take`。

### 进阶追问链

1. **Q：互斥锁为什么能避免优先级反转？** → 自带优先级继承：高优先级任务等锁时，把持锁的低优先级线程临时提级，让持锁者先跑完释放锁，再恢复初始优先级。
2. **Q：事件集和信号量怎么选？** → 事件集是“多条件（与/或）的 32 位标志”，适合一个线程等若干事件同时/任一满足；信号量适合单事件/计数。多事件、需组合判断用事件集。
3. **Q：中断里能用互斥锁吗？** → 不能。`rt_mutex_take` 会阻塞且牵扯所有权；中断只能用 `rt_sem_release`/`rt_event_send`/`rt_mq_send` 等**ISR 安全**的 IPC。
4. **Q：`rt_event_recv` 的 AND/OR 与 `RT_EVENT_FLAG_CLEAR`？** → `RT_EVENT_FLAG_AND` 要求所有位都满足才唤醒，`RT_EVENT_FLAG_OR` 任一满足即唤醒；`RT_EVENT_FLAG_CLEAR` 满足后**清位**（一次性）。

> 📌 一句话记忆：**RT-Thread 同步三件套＝信号量(rt_sem: 事件/计数,无继承,中断可release) / 互斥锁(rt_mutex: 资源独占,有所有权+优先级继承,不可进中断) / 事件集(rt_event: 32位标志,支持与/或等待,多事件组合)；保护资源用互斥锁,多条件用事件集,单事件/计数用信号量。**
