---
title: 操作系统与 RTOS
---

# 操作系统与 RTOS

> 面试里问得最多、也最容易暴露“会不会”的部分：进程/线程、内核态、调度、并发、中断。

## 高频题

- [进程与线程的区别](/guide/os/q-process-thread)
- [用户态与内核态、系统调用](/guide/os/q-user-kernel)
- [死锁四个必要条件与避免](/guide/os/q-deadlock)
- [RTOS 优先级反转](/guide/os/q-priority-inversion)
- [信号量 vs 互斥锁](/guide/os/q-semaphore-mutex)
- [中断上下文里不能做什么](/guide/os/q-interrupt-context)
- [RTOS 任务间通信：队列/事件组/任务通知](/guide/os/q-task-comm)
- [中断嵌套与中断优先级](/guide/os/q-interrupt-nesting)
- [看门狗（Watchdog）](/guide/os/q-watchdog)
- [自旋锁 vs 睡眠锁](/guide/os/q-spinlock)
- [系统调用 vs 库函数](/guide/os/q-syscall-libc)
- [实时性与时延指标](/guide/os/q-realtime)

## 学习建议

先把「内核态/用户态、上下文切换、临界区」三条主线打通，再落实到 RTOS 的任务调度与并发。每题都尝试讲“**为什么**”——面试官通常顺着“为什么”往下挖。
