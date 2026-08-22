---
title: ARM 体系与启动
---

# ARM 体系与启动

> 嵌入式上电的第一件事，以及 CPU 视角的“世界怎么运转”。

## 高频题

- [ARM 异常向量表与启动流程](/guide/arm/q-exception-vector)
- [MMU 与内存管理](/guide/arm/q-mmu)
- [大小端（字节序）](/guide/arm/q-endian)
- [STM32 启动过程](/guide/arm/q-stm32-boot)
- [ARM 寄存器组与工作模式](/guide/arm/q-arm-registers)
- [ARM 异常处理流程（现场保存/恢复）](/guide/arm/q-arm-exception)
- [ARM 指令集：ARM vs Thumb-2 与流水线](/guide/arm/q-arm-instruction)
- [中断控制器：NVIC 与 GIC](/guide/arm/q-nvic-gic)
- [MMU vs MPU（内存管理/保护单元）](/guide/arm/q-mmu-vs-mpu)

## 学习建议

把「异常向量表 → 启动汇编 → MMU/地址映射」这条线串起来，就能答出 CPU 从复位到运行 C 代码做了什么。
