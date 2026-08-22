---
title: FreeRTOS 队列与内存管理
id: freertos-memory
category: os
difficulty: 4
tags: [RTOS, FreeRTOS, 队列, 内存]
company: [智驾, 大疆, 联发科]
keywords: FreeRTOS 队列 动态分配 heap_1 heap_4 静态分配 任务栈 内存管理
answer: |
  **FreeRTOS 队列**：任务间**传数据/同步**的核心。
  - `xQueueCreate(len, itemSize)`：创建，内部**从 FreeRTOS 堆分配**；`len`=消息数、`itemSize`=每条消息字节。
  - `xQueueSend`入队、`xQueueReceive`出队（可**阻塞/超时**）。
  - 队列会**拷贝**消息（itemSize 大小），所以消息别太大、要预算 `len*itemSize` 内存。
  - `xQueueCreateStatic`：用**静态缓冲**（不占堆）。
  **FreeRTOS 内存管理**：
  - `heap_1.c`：只分配不释放（简单）。
  - `heap_2.c`：可释放，**不合并碎片**。
  - `heap_3.c`：包装标准 malloc/free。
  - `heap_4.c`：可释放 + **合并相邻碎片**（推荐）。
  - `heap_5.c`：多内存区（多个不相邻内存块）。
  - `configTOTAL_HEAP_SIZE`：配置堆大小。
  **任务栈**：每个任务**独立栈**（`xTaskCreate` 指定大小），也是内存，要预算（含中断/嵌套/局部大变量）。
why: |
  FreeRTOS 里**队列是任务通信+同步的核心**，但也**消耗内存**（堆）。队列深度、消息大小、任务栈、堆策略直接决定**内存是否足够、是否有碎片、是否稳定**。
  - 选 `heap_4`（合并碎片）或**静态分配**（不依赖堆、可预测）适合**长期稳定**。
  - `heap_1` 无释放、`heap_2` 有碎片——实时/长跑选 `heap_4`/静态。
  - 内存不足会导致**分配失败**（创建队列/任务失败），所以要做**内存预算**。
---
<FlashCard />

## 深读

### 队列用法（核心）

```c
QueueHandle_t q = xQueueCreate(8, sizeof(uint32_t)); // 8 个 uint32 消息
xQueueSend(q, &val, portMAX_DELAY);   // 入队(可阻塞/超时)
xQueueReceive(q, &val, timeout);      // 出队
```

- **拷贝**：消息按 itemSize 拷贝进队列，**传递的是值**，不是指针（除非传指针）。
- **阻塞**：满/空时可阻塞（`xQueueSend` 满可等，`xQueueReceive` 空可等），并配合 `FromISR` 版本在中断里用。

### FreeRTOS 堆实现（heap_x）

| 实现 | 特性 | 适用 |
|---|---|---|
| heap_1 | 只分配、不释放 | 简单、固定 |
| heap_2 | 可释放、无合并 | 较少释放 |
| heap_3 | 封装 malloc/free | 依赖标准库 |
| heap_4 | 可释放+合并 | **推荐**、抗碎片 |
| heap_5 | 多内存区 | 多个不相邻 RAM |

- `configTOTAL_HEAP_SIZE` 定义堆总大小；`xPortGetFreeHeapSize()` 查剩余。

### 静态 vs 动态

- **动态**：`xTaskCreate`/`xQueueCreate`（从 FreeRTOS 堆分配）。
- **静态**：`xTaskCreateStatic`/`xQueueCreateStatic`（用你提供的缓冲，**不占堆**），内存可预测、无堆碎片，适合**安全/确定**场景。

### 任务栈预算

- 每任务独立栈，`xTaskCreate(..., stackDepth, ...)`；栈太小会**栈溢出**（可用 `configCHECK_FOR_STACK_OVERFLOW` 检测）。
- 栈要含：局部变量、调用深度、中断/嵌套（若中断用该栈）余量。

### 常见追问

- 队列传的是值还是指针？——按 itemSize **拷贝值**；传大数据用指针（注意生命周期）。
- 为什么推荐 heap_4？——可释放且**合并碎片**，长期运行更稳。
- 静态分配优点？——无堆、内存可预测、无碎片，适合安全/确定。
- 内存不够会怎样？——创建队列/任务**失败**（返回 NULL/错误）。
- 队列满/空怎么办？——可阻塞/超时；中断里用 FromISR 版（不能阻塞）。

> 📌 一句话记忆：**队列=传值+同步（len×itemSize 耗堆）；FreeRTOS 堆选 heap_4(合并)或静态分配；任务栈要预算，内存不足则分配失败。**
