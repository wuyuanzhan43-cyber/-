---
title: Linux 基础
---

# Linux 基础

> 面向嵌入式 Linux 开发的核心问题：从上电到用户态的启动链路、设备模型、设备树、内核接口。

## 高频题

- [Linux 系统启动流程（上电到应用）](/guide/linux/q-boot)
- [字符设备 vs 块设备](/guide/linux/q-char-block)
- [设备树（Device Tree）的作用](/guide/linux/q-devicetree)
- [proc 与 sysfs 的区别](/guide/linux/q-proc-sysfs)
- [内存管理：kmalloc / vmalloc / 用户态 malloc](/guide/linux/q-mem-management)
- [内存泄漏检测与 OOM](/guide/linux/q-oom-leak)
- [mmap 映射与零拷贝](/guide/linux/q-mmap-zero-copy)
- [Linux 驱动模型三件套](/guide/linux/q-driver-model)
- [内核模块与参数](/guide/linux/q-kernel-module)
- [字符设备驱动开发流程](/guide/linux/q-char-driver)
- [TCP 三次握手与四次挥手](/guide/linux/q-tcp-handshake)

## 学习建议

把「启动链路、设备模型（总线/驱动/设备三件套）、设备树（描述硬件）与内核接口（sysfs/proc）」串起来，就能答出嵌入式 Linux 驱动开发的“地图”。
