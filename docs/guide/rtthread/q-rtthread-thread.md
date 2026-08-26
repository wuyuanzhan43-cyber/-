---
title: RT-Thread 线程控制块 / 状态机 / 创建删除延时
id: rtthread-thread
category: rtthread
difficulty: 4
tags: [RT-Thread, 线程, 状态机, 线程控制块]
company: [智驾, 大疆, 中兴]
keywords: RT-Thread rt_thread 线程控制块 状态机 INIT READY RUNNING SUSPEND CLOSE rt_thread_delay
answer: |
  **RT-Thread 线程 = 最小调度单位的“执行流”，由线程控制块（`struct rt_thread`）描述。** 同一时刻所有线程共享受保护后共享，但各有**独立的栈**和**寄存器现场**。

  ### 线程控制块（`struct rt_thread`）关键字段
  - `parent`（`struct rt_object`）：对象头（线程也是对象）。
  - `stack_addr`/`stack_size`：**任务栈**基址与大小。
  - `current_priority`/`init_priority`：当前/初始优先级；**当前优先级可在运行时变化**（如互斥锁的优先级继承）。
  - `number_mask`：优先级位图掩码。
  - `tlist`：挂在**就绪/延时/等待**链表上的节点。
  - `timeslice`/`init_tick`：时间片；`thread_state`：运行态。
  - `inline event`/`event`：**线程事件**（简单线程间信号）。
  - `entry`/`parameter`：线程入口函数与参数；`user_data`。

  ### 线程状态机
  | 状态 | 含义 | 何时在 |
  |---|---|---|
  | `RT_THREAD_INIT` | 已初始化(创建/静态 init 后) | 未就绪/未启动 |
  | `RT_THREAD_READY` | 就绪，可被调度 | 在就绪链表 |
  | `RT_THREAD_RUNNING` | 运行中(=就绪且正被调度) | 当前线程 |
  | `RT_THREAD_SUSPEND` | 阻塞/挂起(等事件/延时/锁) | 在等待/延时链表 |
  | `RT_THREAD_CLOSE` | 已关闭/待回收 | 停止 |

  ### 创建/销毁
  - **动态创建**：`rt_thread_create(name, entry, param, stack_size, priority, timeslice)` → 内部 `rt_thread_alloc`(栈+TCB) + `rt_thread_init` + `rt_thread_startup`(入就绪)。用完 `rt_thread_delete`。
  - **静态初始化**：`rt_thread_init`（自己提供栈/TCB 内存）+ `rt_thread_startup`；用完 `rt_thread_detach`。
  - **进入调度**：`rt_system_scheduler_start()` 启动调度器后，就绪线程才真正运行；`rt_thread_startup` 只把它放进就绪链表。

  ### 延时与调度
  - `rt_thread_delay(tick)`：把当前线程**挂起**并放入**延时链表**，让出 CPU；tick 到期后由 tick 处理把它唤醒回就绪。
  - `rt_thread_suspend`/`rt_thread_resume`：显式挂起/唤醒。
  - `rt_thread_yield`：让出调度（同级）。
why: |
  这一题考“**线程怎么被调度器管理**”。RT-Thread 线程和 FreeRTOS 任务本质都是“一个栈 + 一个现场 + 一个调度状态”，但也有差别：
  - **为什么有 `current_priority` 和 `init_priority`**：支持**运行时改优先级**（如互斥锁优先级继承、临时提级），释放后恢复初始；
  - **为什么 `rt_thread_create` vs `rt_thread_init`**：前者**动态分配栈+TCB**（灵活但要 `rt_thread_delete` 释放），后者**用外部提供的内存**（静态、无堆开销，适合 RAM 紧张的 MCU、或系统对象）；
  - **为什么 `rt_thread_startup` 只入就绪、不立刻跑**：调度要等 **`rt_system_scheduler_start()`** 启动调度器后才真正切换线程；理解这一点才懂“任务创建不等于立即执行”。
---
<FlashCard />

## 深读

### 线程控制块源码（要点）

```c
struct rt_thread {
  struct rt_object parent;       // 对象头
  void          *stack_addr;     // 栈基址
  rt_uint32_t    stack_size;     // 栈大小(字节)
  rt_uint8_t     current_priority;   // 当前优先级(可变)
  rt_uint8_t     init_priority;      // 初始优先级(回溯用)
  rt_uint32_t    number_mask;        // 优先级位图掩码
  rt_list_t      tlist;              // 就绪/延时/等待链表节点
  rt_uint16_t    timeslice;          // 时间片(剩余 tick)
  rt_uint16_t    init_tick;          // 初始时间片
  rt_uint8_t     thread_state;       // INIT/READY/RUNNING/SUSPEND/CLOSE
  ...
};
```

### 状态迁移

```
rt_thread_create/init → (INIT)
   → rt_thread_startup → READY(入就绪链表)
   → [调度] → RUNNING(当前线程)
   → rt_thread_delay/rt_sem_take(阻塞) → SUSPEND(进入等待/延时链表)
   → 事件到/tick到期 → READY(回到就绪)
   → rt_thread_suspend → SUSPEND
   → rt_thread_resume → READY
   → rt_thread_delete/detach/task自身结束 → CLOSE(回收)
```

### 动态创建 vs 静态初始化

| 维度 | `rt_thread_create`(动态) | `rt_thread_init`(静态) |
|---|---|---|
| 内存 | 内核分配栈+TCB | 用外部提供的栈+TCB |
| 释放 | `rt_thread_delete` | `rt_thread_detach` |
| 适用 | 栈大小灵活、临时线程 | RAM 紧张、系统对象、可预分配 |
| 开销 | 有堆分配 | 无堆，更省/可确定 |

### 工程场景

- **症状**：线程“创建了但没跑”，或删除线程后系统异常/内存泄漏。
- **根因/排查**：未 `rt_system_scheduler_start()`；未 `rt_thread_startup`；动态线程未 `rt_thread_delete`（泄漏）；线程超出栈配额（看 `list_thread` 的 stack 余量）；在中断里创建线程（应避免）。
- **对策**：确认创建→startup→调度器启动顺序；动态线程结束前 `rt_thread_delete`；用 `list_thread`/`list_timer` 观察。

### 进阶追问链

1. **Q：`rt_thread_init` 和 `rt_thread_create` 区别？** → `create` 动态分配栈+TCB（需 `rt_thread_delete`）；`init` 用外部内存（静态，需 `rt_thread_detach`）。资源紧张/确定性场景用 `init`。
2. **Q：线程创建后为什么不立即执行？** → `rt_thread_create` 只是分配并把线程 init；要到 `rt_thread_startup` 入就绪、以及 `rt_system_scheduler_start()` 启动调度器后才被调度执行。
3. **Q：为什么线程有 `current_priority` 和 `init_priority`？** → 支持运行时改优先级（如互斥锁优先级继承/临时提级），释放后用 `init_priority` 恢复，避免优先级残留。
4. **Q：`RT_THREAD_RUNNING` 和 `READY` 区别？** → RUNNING=当前正被调度的就绪线程（同一时刻只有一个）；READY=在就绪链表上可被调度。RUNNING 是“就绪中正占用 CPU”的量。
5. **Q：线程删除了会发生什么？** → `rt_thread_delete` 把线程从就绪/等待链表摘除、释放栈与 TCB（动态），线程进入 `RT_THREAD_CLOSE`。**不要在中断里 delete 线程**。

> 📌 一句话记忆：**RT-Thread 线程＝一个栈+现场+调度状态，由 struct rt_thread 描述(内含对象头/栈/优先级/时间片/链表节点)；状态机＝INIT→READY→RUNNING↔SUSPEND→CLOSE；create(动态,需delete)/init(静态,需detach)+startup，启动调度器后才跑；delay/suspend 挂起让出，resume/事件 唤醒。**
