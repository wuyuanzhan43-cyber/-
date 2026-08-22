---
title: ARM 体系与启动
---

# ARM 体系与启动

> 嵌入式上电的第一件事，以及 CPU 视角的“世界怎么运转”。

## 高频题

- [ARM 异常向量表与启动流程](/guide/arm/q-exception-vector)
- [MMU 与内存管理](/guide/arm/q-mmu)
- [大小端（字节序）](/guide/arm/q-endian)

## 学习建议

把「异常向量表 → 启动汇编 → MMU/地址映射」这条线串起来，就能答出 CPU 从复位到运行 C 代码做了什么。
