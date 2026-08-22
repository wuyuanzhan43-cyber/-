---
title: 总线与通信协议
---

# 总线与通信协议

> 嵌入式里“板级接线”的核心：I2C/SPI/UART 三大件，以及怎么高效搬数据（DMA vs 中断 vs 轮询）。

## 高频题

- [I2C vs SPI vs UART 的区别与选型](/guide/bus/q-bus)
- [DMA 与中断/轮询](/guide/bus/q-dma)
- [CAN 总线要点](/guide/bus/q-can)
- [NOR vs NAND Flash](/guide/bus/q-flash-nor-nand)
- [SPI 时序模式（CPOL/CPHA）](/guide/bus/q-spi-cpol-cpha)
- [I2C 时序（Start/ACK/时钟拉伸）](/guide/bus/q-i2c-timing)

## 学习建议

把三种总线的「信号线数、速度、拓扑、主从、是否支持多设备、速率与用途」做成一张对照表，再用“什么时候选哪个”来落题。DMA 侧重“怎么少占 CPU”。
