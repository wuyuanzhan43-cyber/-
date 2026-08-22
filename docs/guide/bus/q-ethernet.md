---
title: 以太网（MAC/PHY/嵌入式网络）
id: ethernet
category: bus
difficulty: 4
tags: [总线, 以太网, 网络]
company: [海康威视, 联发科]
keywords: 以太网 MAC PHY 帧 MII RMII lwIP
answer: |
  **以太网**：**MAC（媒体访问控制）** + **PHY（物理层）** 实现。
  - **PHY**：物理层，负责**电平/编码/收发/自协商**，与网络介质（双绞线/光纤）连接（如 **YT8512** 是**纯 PHY**）。
  - **MAC**：负责**帧封装/解封装、MAC 地址、CRC、冲突检测（旧）/全双工**，常集成在 MCU/SoC（如 `stm32 eth`）或 MAC 芯片（**DM9000** 是 **MAC+PHY 一体**的控制器）。
  - **MII/RMII**：MAC 与 PHY 之间的接口（RMII 更少引脚）；含 **MDIO** 配置 PHY。
  **以太网帧**：`前导码 | 目的MAC | 源MAC | 类型/长度 | 数据 | FCS(CRC)`。
  **速度**：10/100/1000M（自协商）；全双工常见（无 CSMA/CD）。
  **嵌入式网络**：用 **lwIP/uIP** 等轻量**TCP/IP 协议栈**，结合以太网驱动，做**上网/网关/设备接入**。
why: |
  嵌入式联网（智能/网关/IoT）常用 **MAC(控制器)+PHY(物理)+协议栈(lwIP)** 实现。理解 **PHY（物理/自协商）、MAC（帧/地址/CRC）、MII/RMII 接口、lwIP 栈**，才能做**网络设备/驱动**。
  常见：PHY 配置（自协商/速率/接口 RMII）、MAC 驱动、接入 lwIP（写 `netif`/`ethernetif`）、处理**以太网驱动收发中断**。
---
<FlashCard />

## 深读

### MAC/PHY/栈分层

```
TCP/IP 协议栈(lwIP) 
        ↕
    MAC 控制器(帧封装/地址/CRC)  ← 数据链路层
        ↕  MII/RMII(+MDIO)
    PHY(物理层: 电平/编码/自协商) 
        ↕  双绞线/光纤
```

- **PHY**：物理信号，自协商速率/双工。
- **MAC**：帧、MAC 地址、FCS/CRC、全双工。
- **协议栈**：TCP/IP（lwIP/uIP）。

### 以太网帧字段

```
前导码 | 目的MAC | 源MAC | 类型/长度 | 数据(46~1500) | FCS(CRC)
```

- **MAC 地址**：48 位，区分设备。
- **类型**：标识上层协议（如 IP=0x0800）。
- **FCS**：帧校验（CRC），错则丢弃。

### MII/RMII 接口

- **MII**：MAC↔PHY，信号多（TX/RX 通道+时钟+控制）。
- **RMII**：**减少引脚**（50MHz 参考时钟，共用）——**嵌入式常用**。
- **MDIO**：管理接口，配置 PHY（速率/协商/状态）。

### 嵌入式协议栈（lwIP）

- **lwIP**：轻量 TCP/IP，适合 MCU；提供 `netif`/`ethernetif` 接口，需实现**底层收发（写/读以太网驱动）**。
- 用 **lwIP+以太网** 做 **TCP/UDP 通信、Web 服务器、设备接入、网关**。
- 常见：**网卡初始化（PHY 自协商、MAC 使能）、收发中断/DMA、注册 netif**。

### 常见追问

- 以太网帧怎么组成？——前导+目的/源MAC+类型+数据+FCS。
- PHY 和 MAC 区别？——PHY 物理层（信号/协商），MAC 数据链路（帧/地址/CRC）。
- 什么是 MII/RMII？——MAC↔PHY 接口；RMII 少引脚，嵌入式常用。
- 嵌入式干嘛用 lwIP？——轻量 TCP/IP 栈，配合以太网驱动做联网。

> 📌 一句话记忆：**以太网=MAC(帧/地址/CRC)+PHY(物理/自协商)+MII/RMII(+MDIO)接口+lwIP协议栈；嵌入式用 lwIP 做联网。**
