---
title: Linux 内存管理：kmalloc / vmalloc / 用户态 malloc
id: mem-management
category: linux
difficulty: 3
tags: [Linux, 内存管理, 驱动]
company: [海康威视, 中兴]
keywords: kmalloc vmalloc malloc 物理连续 虚拟连续 DMA OOM 内存泄漏
answer: |
  **kmalloc**：在内核里分配**物理连续**的内存，地址通常来自**低内存/直接映射区**，小而快，适合 **DMA、驱动缓冲区**（需要物理连续/一致访问）。大块或跨页需 `__GFP_*` 或映射到大页，可能睡眠（`GFP_KERNEL`）或在原子上下文用 `GFP_ATOMIC`。
  **vmalloc**：分配**虚拟连续但物理可能离散**的大块内存，地址在**高端/vmalloc 区**，用于**大块、不需要物理连续**的场合（内核模块、大缓冲区）；访问可能触发缺页，比 kmalloc 慢。
  **用户态 malloc**：在**进程虚拟地址空间**里用 `brk`/`mmap` 分配，操作系统**按需分页**，进程只看到自己的地址空间；从内核视角，物理页由内核页表管理，用户态与内核态**地址空间隔离**，传数据要拷贝（`copy_to_user`/`copy_from_user`）。
  **注意**：内核与用户态之间不能直接传指针（地址空间不同），要 `copy_*_user`；内存有**泄漏、OOM、DMA 缓存一致性**（`dma_map`/`dma_alloc_coherent`）等问题。
why: |
  核心是区分“**物理连续**”与“**虚拟连续**”：kmalloc 要物理连续（给 DMA/驱动用），vmalloc 只要虚拟连续（大块但不需要物理连续）。这是驱动开发选型的依据。
  用户态/内核态地址空间**隔离**，所以两态互传指针需要拷贝或专门映射（`mmap`），理解这点才能写对驱动、避免越界/泄漏。
---
<FlashCard />

## 深读

### 三种分配对照

| 分配 | 物理连续 | 虚拟连续 | 用途 | 特点 |
|---|---|---|---|---|
| `kmalloc` | ✅ | ✅ | 小/中块、DMA | 快，低内存直映，跨页可能失败 |
| `vmalloc` | ❌ | ✅ | 大块、内核模块 | 慢，高端地址，可能缺页 |
| 用户态 `malloc` | 由内核页表决定 | ✅（虚拟空间） | 用户进程 | 按需分页、虚拟内存 |

### kmalloc vs vmalloc 细节

- `kmalloc(size, GFP_KERNEL)`：从 slab/伙伴系统拿**物理连续**页；`GFP_KERNEL` 可睡眠（用于进程上下文），`GFP_ATOMIC` 用于原子/中断（不能睡眠但可能失败）。
- `vmalloc(size)`：只保证**虚拟连续**，底层物理页可离散，需建页表（可能缺页），适合**大块缓冲**（模块、设备大缓冲）。
- 对于 **DMA** 需要**物理连续 + 一致访问**：常用 `dma_alloc_coherent` / `dma_map_single`，并处理**缓存一致性（Cache coherency）**。

### 用户态与内核态的隔离

- 用户进程看自己的虚拟地址空间；内核有独立地址空间。
- 用户态指针**不能**直接在内核里解引用（地址空间不同），必须 `copy_from_user` / `copy_to_user`（内核提供，做了指针校验，防传播）。
- 可用 `mmap` 把内核缓冲映射给用户态，避免频繁拷贝（零拷贝思路）。

### 常见内存问题（驱动/系统）

- **内存泄漏**：`kmalloc`/`vmalloc`/用户态 `malloc` 忘记释放 → 内存耗尽。
- **OOM**：内存不足时内核可能 OOM-kill 进程。
- **DMA 缓存一致性**：DMA 写内存后 CPU 缓存旧值，需 `dma_map`/invalidate。
- **越界/悬垂**：野指针、释放后使用、越界写。

### 常见追问

- 为什么 DMA 要物理连续？——DMA 控制器直接按物理地址搬数据，不管虚拟地址；`kmalloc` 给物理连续，`vmalloc` 不行。
- 用户态和内核态能直接用同一个指针吗？——不能，地址空间隔离，需 `copy_*_user` 或 `mmap` 映射。
- `GFP_ATOMIC` vs `GFP_KERNEL`？——`KERNEL` 可睡眠（进程上下文），`ATOMIC` 不睡眠（中断/原子上下文），可能更快失败。
- DMA 与缓存一致性详见`DMA 与 Cache 一致性（q-dma-cache）`。

> 📌 一句话记忆：**kmalloc=物理连续（DMA/驱动小中块，快）；vmalloc=虚拟连续（大块，慢）；用户态 malloc 在进程地址空间，两态互传要 copy_*_user。**
