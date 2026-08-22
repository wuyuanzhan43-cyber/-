---
title: DMA 与 Cache 一致性
id: dma-cache
category: linux
difficulty: 4
tags: [Linux, DMA, Cache, 一致性]
company: [联发科, 海康威视]
keywords: DMA cache一致性 dma_map dma_alloc_coherent 脏数据 invalidate flush 内存屏障
answer: |
  **问题**：DMA 直接读写内存，但 CPU 的 **cache 与内存可能不一致**：
  - **方向 设备→内存（CPU 读）**：DMA 写入内存后，CPU cache 里可能还是**旧值**，读到的数据是脏的 → 需 **invalidate（失效）cache**。
  - **方向 CPU→设备（DMA 读）**：CPU 写入 cache 后 DMA 读内存可能读到旧值 → 需 **flush（写回）cache**。
  **Linux 解决**：
  - `dma_map_single` / `dma_unmap_single`（流式 DMA）：搬运前/后由内核做**必要的 flush/invalidate**，再配合**内存屏障**。
  - `dma_alloc_coherent`（一致性映射）：**映射到无 cache 或自动维护一致性**的区域，CPU 与 DMA 看到的始终一致，适合持续访问。
  - 用 `dma_map_*`/`dma_unmap_*` 包裹每次传输；`DMA_TO_DEVICE`（CPU→设备）与 `DMA_FROM_DEVICE`（设备→CPU）方向不同，处理不同。
  **还要注意**：**内存屏障**（`dma_wmb`/`dma_rmb` 或 `__sync_synchronize`，配合 `dst/rmb/wmb`），保证 DMA 与 CPU 的**访问顺序**；以及**地址对齐、无效内存访问（OOPS）**。
why: |
  现代 CPU 有 **cache（多级、写回）**，而 DMA **绕过缓存直接访问**物理内存。二者**不同步**就会读到**旧值/脏数据**，是**驱动/嵌入式最易踩的坑**之一。
  `dma_alloc_coherent`/`dma_map_*` 就是内核帮你**同步 cache 与内存**（flush/invalidate + barrier）的接口，保证 CPU 与 DMA 看到同一份数据。不理解就会：**DMA 收的数据是旧的、CPU 写的没被 DMA 读走、数据错乱**。
---
<FlashCard />

## 深读

### 为什么 DMA 与 cache 会不一致

- CPU 访问内存**先看 cache**（命中不访内存）。
- DMA **直达物理内存**，不看 cache。
- 结果：CPU 改了缓存但内存还是旧值（DMA 读旧）；DMA 改了内存但 CPU 缓存还是旧值（CPU 读脏）。

```
CPU --cache--> 物理内存 <--DMA(直接)
        ↑ 不一致风险
```

### 两个方向的正确处理

| 方向 | 处理 |
|---|---|
| CPU 写 → DMA 读（TO_DEVICE） | 传输前 flush 写回，让 DMA 读到最新 |
| DMA 写 → CPU 读（FROM_DEVICE） | 传输后 invalidate，避免 CPU 读到旧 cache |

### Linux DMA API

```c
struct device *dev = ...;
dma_addr_t dma = dma_map_single(dev, buf, len, DMA_TO_DEVICE);
// 硬件搬运
dma_unmap_single(dev, dma, len, DMA_TO_DEVICE);
```

- `dma_map_single/dma_unmap_single`：**流式**，每次传输前后做一致性处理。
- `dma_alloc_coherent`：**一致性映射**，cpu 侧用 `dma_alloc_coherent` 分配 + `dma_handle`，内核保证一致性（常为无 cache 或自动同步），适合长期/频繁访问。
- `dma_map_*` 要成对 unmap，`DMA_FROM_DEVICE/TO_DEVICE/BIDIRECTIONAL` 选对方向。

### 内存屏障（barrier）

- 除了 cache 一致性，还要**保证访问顺序**：CPU 写描述符后要确保 DMA 看到（`dma_wmb`/写屏障），DMA 完成后再读状态（`dma_rmb`/读屏障）。
- 否则 CPU 乱序优化可能让 DMA 在描述符就绪前就开始读。

### 嵌入式/裸机（无 Linux）

- 手动 **flush/invalidate cache**（如 ARM 的 `__flush_dcache_all`/`clean`/`invalidate`），或用 **MPU/无 cache 映射** DMA 缓冲。
- 或关闭该区域 cache、用 **ioremap（无 cache 属性）**。
- 都要配合**数据同步屏障（DSB）**。

### 常见追问

- DMA 读 CPU 写的内存为什么错？——CPU 写了 cache，内存还是旧值 → 需 flush。
- DMA 写内存 CPU 为什么读旧？——DMA 写了内存，CPU cache 还是旧值 → 需 invalidate。
- `dma_alloc_coherent` 和 `dma_map_single` 区别？——前者一致性映射（免手动同步，适合持续），后者流式（每传输做一次 sync）。
- 为什么要内存屏障？——保证 CPU/DMA 的访问顺序，防乱序。

> 📌 一句话记忆：**DMA 绕 cache 直访内存会不一致：CPU→设备要 flush(写回)，设备→CPU 要 invalidate(失效)；用 dma_map_/dma_alloc_coherent + 内存屏障。**
