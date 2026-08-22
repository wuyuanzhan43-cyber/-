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

### ★ 深入：为什么 DMA 会遇到 cache 问题（什么时候会“炸”）

**一句话根源**：CPU 有 **cache（多级、写回）**，DMA **直连物理内存、不经过 cache**。二者**看到的是同一个物理地址，但“最新值”可能只在 cache / 只在内存**，于是不一致。

**关键点：现代 CPU 是多级 + 写回 cache**。CPU“写”往往先写进 cache（脏行），**不一定立刻回写内存**；CPU“读”先看 cache，命中就不访内存。DMA 却**直接读写物理内存**。

**两个方向的“炸点”**：

| 方向 | 什么时候出问题 | 表现 |
|---|---|---|
| CPU 写 → DMA 读 | CPU 把数据写进 cache 未回写，DMA 读内存读到**旧值** | DMA 收了旧数据 |
| DMA 写 → CPU 读 | DMA 把数据写进内存，但 CPU cache 里还是**旧值（脏）** | CPU 读到旧数据/脏数据 |

**具体什么时候会“炸”**（工程里的高频触发场景）：
- **刚用 `cpu` 代码填好缓冲，交给 DMA 发出去**：没 flush → DMA 发出的是 cache 里的旧值。
- **DMA 搬完数据，CPU 立刻去读缓冲区**：没 invalidate → CPU 读到的是 cache 旧值。
- **DMA 与 CPU 同时访问同一块内存**（如网络收包、图像缓冲、双缓冲）→ 数据错乱。
- **缓存一致性仅靠“关 cache”**：不精确、性能差、还可能遗漏。

**为什么不能只“关 cache”就行**：整片关影响所有代码的数据一致性/性能；正确做法是**只对 DMA 涉及的缓冲做 flush/invalidate**（`dma_map_*/dma_alloc_coherent`），并加**内存屏障**保证顺序。

> 📌 一句话记忆：**DMA 绕 cache 直访内存会不一致：CPU→设备要 flush(写回)，设备→CPU 要 invalidate(失效)；用 dma_map_/dma_alloc_coherent + 内存屏障；根源是“最新值可能在 cache 或内存，而 DMA 只认内存”。**
