---
title: Linux 内存泄漏检测与 OOM
id: oom-leak
category: linux
difficulty: 3
tags: [Linux, 内存, 调试]
company: [海康威视, 中兴]
keywords: 内存泄漏 OOM /proc/meminfo valgrind 页表 slab 内存耗尽
answer: |
  **内存泄漏**：分配的堆内存未释放（或不再可达却未释放），长期运行导致可用内存逐渐减少，最终触发 **OOM**。
  **OOM（Out Of Memory）**：系统内存严重不足时，内核可能触发 **OOM killer**（挑选一个占用较大的进程杀掉）或分配失败返回错误。
  **检测手段**：
  - 用户态：**Valgrind**（Valgrind memcheck）、**AddressSanitizer（ASan）**、**LeakSanitizer**。
  - 内核态：**kmemleak**、`ftrace`/`slabinfo`、`/proc/slabinfo`、`/proc/meminfo`、`/sys/kernel/debug/kmemleak`。
  - 通用：监控 `/proc/meminfo` 的 `MemAvailable`、`/proc/<pid>/status` 的 `VmRSS`、`/proc/<pid>/smaps`；用 `strace`/`perf` 观察分配。
  **避免**：配对分配/释放、用 RAII/自动释放（C++）、用 `kmalloc/kfree` 一一对应、避免循环引用、用内存池/静态分配。
why: |
  泄漏让内存**慢慢耗尽**，表现是“运行越久越卡/申请失败/OOM-kill”。嵌入式长跑设备尤为致命。所以要在**开发期用工具**找出泄漏，并在**设计上配对分配**。
  区分“分配了但确实需要”与“泄漏”：关键是**是否还有有效引用/释放路径**。工具通过跟踪分配/释放配对、未释放的块来定位。
---
<FlashCard />

## 深读

### 检测工具一览

| 层次 | 工具 | 说明 |
|---|---|---|
| 用户态 | Valgrind / ASan / LeakSanitizer | 跟踪分配/释放，报告未释放块 |
| 用户态 | `/proc/<pid>/status` / `smaps` | 观察进程 VmRSS / 映射 |
| 内核态 | `kmemleak` | 扫描未释放对象 |
| 内核态 | `/proc/slabinfo` / `slabtop` | slab 缓存使用 |
| 系统 | `/proc/meminfo`（MemAvailable） | 可分配内存趋势 |
| 运行时 | `perf` / `ftrace` / `strace` | 观察分配/系统调用 |

### 用户态泄漏排查流程

1. 运行 `valgrind --leak-check=full ./app` 看报告。
2. 或用 `-fsanitize=address` 编译，运行定位泄漏/越界。
3. 观察 `/proc/<pid>/status` 的 `VmRSS` 是否随循环增长。

### 内核态泄漏排查

- 打开 `/sys/kernel/debug/kmemleak`，「scan」后看报告，定位未释放的内核对象。
- 查看 `/proc/slabinfo` 里某个 `kmalloc-*` 缓存是否持续增大。
- 驱动里注意 `kmalloc/kfree`、`dma_alloc/free`、设备资源 `devm_*` 的配对。

### 为什么会 OOM / 为什么 OOM killer

- 系统可分配（物理+swap）不足时，内核按某策略挑选进程杀掉（**OOM killer**），以保住系统。
- 也可能**分配失败**返回 `ENOMEM`（尤其非阻塞分配、`GFP_ATOMIC`）。
- 嵌入式常**不开 swap**，OOM 更容易发生 → 更要做内存预算与配额，用 **cgroup 内存限制**、`oom_score_adj` 控制。

### 避免/治理

- **配对分配/释放**：每个 `malloc/kmalloc` 有明确释放点。
- **RAII/智能指针**（C++）、`devm_*`（驱动自动释放）。
- **内存池 / 静态分配**：嵌入式/实时场景避免动态碎片。
- **监控 + 告警**：定期查 `MemAvailable`/`VmRSS`，超过阈值报警。

### 常见追问

- 泄漏和“还没释放的合法占用”怎么区分？——看是否还有有效引用、是否还会用到；工具报“still reachable”多半是合法，报“definitely lost”才是泄漏。
- OOM 一定是因为泄漏吗？——不一定，也可能是一次性大分配、碎片、或全局内存不足；但泄漏是常见根因。
- 为什么嵌入式更怕泄漏？——无 swap、内存小、长跑，泄漏会稳定导致性能下降或崩溃。

> 📌 一句话记忆：**泄漏=分配未释放→内存慢慢耗尽→OOM；用 Valgrind/ASan/kmemleak 检测，设计上配对分配；OOM 由内核挑进程杀掉。**
