---
title: RT-Thread 网络架构（SAL / netdev / LwIP 分层总览）
id: rtthread-net-arch
category: rtthread
difficulty: 4
tags: [RT-Thread, 网络, SAL, netdev, LwIP]
company: [智驾, 大疆, 海康威视]
keywords: RT-Thread 网络 SAL netdev 网卡 LwIP 分层 socket 协议栈
answer: |
  **结论先行**：RT-Thread 的网络是**分层的**——**SAL（Socket 抽象层）+ netdev（网卡层）+ 协议栈（LwIP）**，上层再跑 **MQTT/WebClient/Modbus/CoAP/OTA** 等应用协议。目的是**对上层“统一 socket 接口”、对下层“统一管理多网卡”**。

  ### 三层结构（图）
  ```
  [应用层]  MQTT / WebClient / Modbus / CoAP / OTA 等
       │ 用标准 socket(BSD) 接口
  ──────┼─────────────────────────────
  [SAL]  Socket 抽象层：统一 socket / bind / connect / send / recv
       │ 根据地址族/网卡分发到底层
  ──────┼─────────────────────────────
  [netdev]  网卡(网络接口)层：统一管理多网卡(eth0/wlan0/ppp)
       │ 处理 IP/路由/状态, 提供 netdev 接口
  ──────┼─────────────────────────────
  [协议栈]  LwIP (TCP/IP) 或 其它；底层接 网卡驱动(eth/wlan/AT模组)
  ```

  ### 各层作用
  - **SAL（Socket Abstraction Layer）**：给上层**统一 BSD socket API**（`socket/bind/connect/send/recv`），屏蔽底层协议栈差异（LwIP/其它）；上层不用管是哪个栈。
  - **netdev（Network Interface）**：**统一管理网卡**——一个设备可有多个网卡（有线 eth0、WiFi wlan0、4G ppp）；netdev 处理 IP 获取/路由/状态，并提供 `netdev_set_ipaddr` 等接口；解决“多网卡/多网名”问题。
  - **LwIP**：轻量 TCP/IP 协议栈，实现 IP/TCP/UDP/ARP/DHCP/DNS 等；底层由**网卡驱动**（或 AT 模组）接入。
  - **应用**：基于 SAL/socket 写应用协议（MQTT/HTTP/Modbus），上层一次写、跨网卡/栈复用。

  ### 一句话
  **RT-Thread 网络＝SAL(统一 socket) + netdev(多网卡管理) + 协议栈(LwIP) + 应用协议(MQTT 等)，分层解耦、组件化装配。**
why: |
  这一题考“**RT-Thread 网络为什么分层**”，是把**复杂网络**做成**组件化、可裁剪、可复用**的关键：
  - **为什么要有 SAL**：不同协议栈（LwIP/其它）的 socket 接口不同，应用若直接调某栈，换栈要改应用。**SAL 统一成 BSD socket**，应用只写一次，栈可换。——解耦“应用”与“栈”。
  - **为什么要有 netdev**：嵌入式常有**多网卡**（有线+WiFi+4G），且用 AT 模组时网卡是“虚拟”的。**netdev 统一管理每张网卡**的 IP/状态/路由，配合 `sal_` 层按网卡分发，解决“哪个网卡、哪个 IP、走哪条网”。——解耦“多网卡”与“协议栈”。
  - **为什么用 LwIP**：轻量、官方移植齐全，适合 RAM/Flash 有限的 MCU；底层用网卡驱动或 AT 模组接入。
  - **为什么应用协议能复用**：上层只依赖 SAL/socket，所以 MQTT/WebClient/Modbus/OTA 都是“组件”，勾选即用、跨网卡/板卡复用。
  - 这一题答好，说明你理解“**网络是分层的组件**”，而非“一堆 socket 函数”。
---
<FlashCard />

## 深读

### 更好看的完整链路图

```
┌─────────────────────────────────────────────────────┐
│  应用协议  MQTT / CoAP / WebClient(HTTP) / Modbus / OTA │
└──────────────────┬──────────────────────────────────┘
                   │ BSD socket：socket()/bind()/connect()/send()/recv()
┌──────────────────▼──────────────────────────────────┐
│  SAL（Socket 抽象层）                                │
│  · socket/bind/connect/send/recv 统一接口           │
│  · 支持 IPv4/IPv6、TCP/UDP；按地址族 + 网卡分发      │
└──────────────────┬──────────────────────────────────┘
                   │ sal_ 接口（ipaddr / 网卡选择）
┌──────────────────▼──────────────────────────────────┐
│  netdev（网络接口/网卡层）                            │
│  · 多网卡：eth0 / wlan0 / ppp(4G)                    │
│  · 管理 IP / 路由 / 连接状态；netdev_set_* 接口       │
└──────────────────┬──────────────────────────────────┘
                   │ 网卡驱动 / AT 模组接入
┌──────────────────▼──────────────────────────────────┐
│  LwIP（TCP/IP 协议栈）IP/TCP/UDP/ARP/DHCP/DNS      │
│  底层：有线网卡驱动 / WiFi(STA) / 4G(ppp) / AT      │
└─────────────────────────────────────────────────────┘
```

### 组件开关（rtconfig.h / menuconfig）

| 宏 | 作用 |
|---|---|
| `RT_USING_SAL` | 启用 SAL 抽象层 |
| `RT_USING_NETDEV` | 启用 netdev 网卡层 |
| `RT_USING_LWIP` | 启用 LwIP 协议栈 |
| `RT_USING_AT` | AT 模组(esp32/ec200 等) |
| 应用协议 | `RT_USING_MQTT`/`RT_USING_WEBCLIENT`/`RT_USING_MODBUS` 等 |

### 工程场景/坑

- **症状**：能 ping 通但 socket connect 失败；或不知道走哪张网卡。
- **根因/对策**：网卡没启动/没拿到 IP（看 `netdev` 状态）；SAL 未启用/地址族不匹配；多网卡时没指定网卡。用 **finsh/msh** 的 `ifconfig`（查看 netdev 网卡 IP）、`ip_addr`、socket 命令排错。

### 进阶追问链

1. **Q：SAL 和 netdev 各解决什么？** → SAL 统一 **socket 接口**（解耦“应用”与“协议栈”）；netdev 统一 **多网卡管理**（解耦“多网卡/网名”与“协议栈”）。一个偏“接口统一”，一个偏“网卡管理”。
2. **Q：为什么用 LwIP 而不是正经 Linux TCP/IP？** → 嵌入式 MCU RAM/Flash 有限，LwIP 轻量、官方移植齐全；配合 SAL/netdev 能组件化装配，无需完整网络栈。
3. **Q：多网卡怎么区分走哪张？** → 用 **netdev**（网卡层管理多网卡 + 路由/IP），SAL 按地址族/网卡分发；应用可用 `netdev`/`sal` 指定网卡，或用路由规则。
4. **Q：AT 模组（WiFi/4G）怎么接？** → 通过 **AT 组件**把 AT 指令封装成“网卡”，挂到 netdev；SAL/LwIP 之上应用照常写 socket，不用关心底层是物理网卡还是 AT 虚拟网卡。

> 📌 一句话记忆：**RT-Thread 网络＝应用协议(MQTT/CoAP/WebClient/Modbus/OTA) → SAL(统一 BSD socket,解耦换栈) → netdev(多网卡管理,eth/wlan/ppp/AT) → LwIP(轻量TCP/IP)；分层组件化、menuconfig 勾选即用；排错用 finsh 的 ifconfig/ip_addr 看网卡与 IP。**
