---
title: RT-Thread 架构与内核对象模型
id: rtthread-arch
category: rtthread
difficulty: 4
tags: [RT-Thread, 内核对象, 架构]
company: [智驾, 大疆, 汇顶]
keywords: RT-Thread rt_object 对象容器 内核对象 架构 万物皆对象 线程 信号量 设备
answer: |
  **RT-Thread 核心架构特征：一切皆对象（rt_object）。** 线程、信号量、互斥锁、事件集、消息队列、邮箱、定时器、设备……都继承自 `struct rt_object`，由**内核对象容器（object container）**统一管理。

  ### 对象模型
  - 每个内核对象的头部都有 **`struct rt_object`**：`name`（对象名）、`type`（对象类型：线程/信号量/互斥/事件/队列/邮箱/定时器/设备）、`flag`、以及**对象链表节点**。
  - **对象容器**：`rt_object_container` 是一组按**类型**分门别类的对象链表（如 `rt_object_container[RT_Object_Class_Thread]` 链表下挂所有线程）。内核用 `rt_object_get`/`rt_object_try_get` 按名字找对象。
  - 好处：**统一管理、可按名字查找、便于 O(1) 查询对象是否存活**（`rt_object_is_systemclass` 判断是否系统对象）。

  ### 分层（标准版）
  - **内核层**：线程/调度（`scheduler`）、IPC（信号量/互斥/事件/队列/邮箱/信号）、内存管理、时钟/定时器、中断管理。
  - **组件层**：设备框架、文件系统（DFS）、网络（LwIP/SAL）、图形/UI 等——**可选装**，靠 `menuconfig`/`INIT_*_EXPORT` 装配。
  - **平台/驱动层**：BSP、驱动（串口/GPIO/I2C/SPI 等），经**设备框架**接入。

  ### 一句话
  **RT-Thread = 内核（线程/调度/IPC/内存/定时器/中断，万物皆 rt_object）+ 组建设备框架（DFS/网络，可选）+ 驱动层；用对象容器统一管理，用 `INIT_*_EXPORT` 自动初始化。**
why: |
  架构差异常被拿来考“RT-Thread 与 FreeRTOS 有什么本质不同”。**FreeRTOS 里各模块是“各自独立的 handle/句柄类型”**（队列句柄、信号量句柄、任务句柄互相不通用）；**RT-Thread 则把一切对象统一为 `rt_object`**：
  - **为什么统一对象**：内核只需要一套**对象容器**和**复制/初始化/查找**逻辑，并能做“对象是否存活/是否系统对象”的统一判断；也支撑**按名字裁剪/查找、对象级调试**。
  - **为什么会影响用起来的感觉**：RT-Thread 的 API 更“**向内核对象化**”（`rt_thread_create`、`rt_sem_create`、`rt_device_open` 都对对象操作），而 FreeRTOS 更“**句柄化**”。
  理解对象模型，才能回答“RT-Thread 为什么能一套内核对象承载这么多组件”。
---
<FlashCard />

## 深读

### `struct rt_object`（对象头，被所有内核对象“继承”）

```c
struct rt_object {
  char       name[RT_NAME_MAX];    // 对象名
  rt_uint8_t type;                 // 对象类型(线程/信号量/互斥/事件/队列/邮箱/定时器/设备/内存池...)
  rt_uint8_t flag;                 // 标志(是否静态分配/是否系统对象等)
  rt_list_t  list;                 // 挂在对应对象容器链表上的节点
};
// 结构体“继承”: 线程 = struct rt_thread { struct rt_object parent; ... 线程特有字段 }
```

### 对象容器

```c
struct rt_object_information {
  rt_class_t  type;
  rt_list_t   object_list;   // 该类型对象链表
};
static struct rt_object_information rt_object_container[RT_Object_Class_Unknown];
```
- 内核按**类型**维护若干对象链表；`rt_object_allocate` 分配并挂链表、`rt_object_delete` 摘除。
- 支持 `rt_object_get`（按名字、类型找对象），方便调试与框架层按名拿对象。

### 线程是如何“对象”的（面向对象在 C 里的落地）

```c
struct rt_thread {
  struct rt_object parent;   // “继承” rt_object → 线程也是一种对象
  void  *stack_addr;         // 任务栈基址
  rt_uint32_t stack_size;
  rt_uint8_t  current_priority, init_priority;  // 当前/初始优先级
  rt_uint16_t number_mask;   // 优先级位图对应掩码
  rt_list_t   tlist;         // 就绪/延时链表节点
  rt_uint16_t timeslice, init_tick;             // 时间片 + tick
  ...
};
```
- 这种“**对象头 + 派生结构**”是 RT-Thread 在 C 里做“继承”的方式：共用 `parent`，实现对象容器的统一管理。

### 工程场景

- **症状**：想按组件/对象“裁剪”或“查找”某个内核对象（如调试时按名找信号量），RT-Thread 因为有对象容器很容易；用 FreeRTOS 得自己维护句柄表。
- **根因/对策**：RT-Thread 的 `rt_object_` 系列 API + 对象容器让“对象管理/查找/存活判断”内建；借助 **finsh/msh shell 的 `list_*` 命令**（如 `list_thread`）就能看到所有线程/对象，很利于调试。

### 进阶追问链

1. **Q：RT-Thread 为什么“万物皆对象”？** → 统一对象头 + 容器，让内核只需一套“分配/初始化/查找/释放”逻辑，并支撑按名查找、对象级调试、`rt_object_is_systemclass` 判断；也便于组件（进程外设）按对象接入。
2. **Q：对象容器和 FreeRTOS 的“句柄”区别？** → FreeRTOS 各模块各自维护句柄（队列/信号量/任务 Handler 类型不同、不通用）；RT-Thread 用一个 `rt_object` + `rt_object_information` 容器统一管理，类型维度不同。
3. **Q：`rt_object_type` 有哪些？** → `RT_Object_Class_Thread/Semaphore/Mutex/Event/MailBox/MessageQueue/Timer/Device/MemoryPool/...`；`rt_object_class` 决定走哪个容器链表。
4. **Q：对象会泄漏吗？** → `rt_object_allocate` 分配内核对象（如 `rt_sem_create`），需用 `rt_sem_delete` 释放；动态创建对象要在组件停止/退出时释放，否则一直占内存。

> 📌 一句话记忆：**RT-Thread＝万物皆 rt_object（对象头 name/type/flag/list + 派生结构体），由 rt_object_information 对象容器按类型统一管理(分配/查找/存活判断)；内核(线程/调度/IPC/内存/定时器/中断)+组建设备框架(DFS/网络,可选)+驱动层；与 FreeRTOS 的“各管各句柄”架构上是本质差别。**
