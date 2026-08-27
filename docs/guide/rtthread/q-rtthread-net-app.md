---
title: 应用协议（MQTT / WebClient / Modbus / CoAP / OTA）
id: rtthread-net-app
category: rtthread
difficulty: 4
tags: [RT-Thread, 网络, MQTT, WebClient, Modbus, OTA]
company: [智驾, 大疆, 海康威视]
keywords: RT-Thread MQTT WebClient Modbus CoAP OTA 上云 应用协议
answer: |
  **结论先行**：RT-Thread 的应用协议都是**建立在 SAL/socket 之上的现成组件**，勾选即可用；按**场景**选：**上云用 MQTT，Web 交互用 HTTP(WebClient)，工业/现场用 Modbus，资源受限/一问一答用 CoAP，固件升级用 OTA**。

  ### 常用应用协议（对照）
  | 协议 | 用途 | 特点 |
  |---|---|---|
  | **MQTT** | 物联“上云”（发布/订阅） | 轻量、可靠、断线重连、QoS 0/1/2、适合大量设备与云平台 |
  | **WebClient(HTTP)** | Web 服务/接口 | 请求-响应，适合拉取/上报 HTTP API |
  | **Modbus** | 工业现场(RS485/TCP) | 主从、寄存器读写、RTU/TCP |
  | **CoAP** | 资源受限/低功耗设备 | 类 HTTP 但要省，UDP、请求-响应 |
  | **OTA** | 固件升级 | 从服务器拉固件、校验、分区写入、重启 |

  ### MQTT 上云（RT-Thread 组件示例）
  - 用 `rt_mqtt` 组件：`rt_mqtt_init`（连 broker/账号/主题）→ 发布/订阅（`pub`/`sub`）→ 处理消息。
  - 基于 SAL/socket + **TLS**（`mbedTLS`）做加密；配合网络(LwIP/netdev)与 AT/WiFi 上云。

  ### 与设备/文件系统的配合
  - 数据来源：传感器经**设备框架**(sensor/rt_device)读取；存储用 **FlashDB/EasyFlash**；上报用 MQTT/HTTP。
  - OTA：先下载到分区（SPI Flash + 文件系统/FlashDB），校验（CRC/签名），再写启动分区、重启。

  ### 一句话
  **RT-Thread 应用协议＝基于 SAL/socket 的组件：上云 MQTT、Web 用 HTTP、现场用 Modbus、省资源用 CoAP、升级用 OTA；配合设备框架+FlashDB+分区即可落地。**
why: |
  这一题考“**RT-Thread 怎么把设备“联网/上云”这件事做成组件**”。核心是**复用 SAL 统一接口**：
  - **为什么都是组件**：都基于 SAL/socket（标准 BSD 接口）写一次，所以能在 RT-Thread 不同栈/网卡上复用；勾选 `RT_USING_MQTT` 等宏即接入。
  - **为什么按场景选**：MQTT 适合“**设备多、要实时/可靠、断线重连**”的上云；HTTP 适合**请求-响应**的 Web 接口；Modbus 是**工业现场主从**；CoAP 是**资源受限/低功耗**；OTA 是**运维**。
  - **为什么常配 TLS**：上云要安全，用 **mbedTLS** 给 MQTT/HTTP 加证书/加密。
  - **为什么和 FlashDB/OTA 一起**：设备“采集→存→上报→升级”是完整链路，RT-Thread 把这些都组件化，**按需拼装**。
  - 这一题答好，说明你懂“**联网产品 = 组件拼装**”，而不是从零写网络。
---
<FlashCard />

## 深读

### 一个“云-端”完整链路

```
[传感器] → rt_device(设备框架) 读数据
   ↓
[FlashDB] 本地存储/日志(失败可补报)
   ↓
[网络]  SAL/netdev + LwIP + AT/WiFi(或4G) 联网
   ↓
[MQTT 组件] 发布数据到云(经纪人) / 订阅控制指令
   ↓(TLS/mbedTLS 加密)
[云平台] 阿里/腾讯/自研
```

### OTA 流程

```
[云/服务器] 固件包
   ↓ 下载(HTTP/MQTT) + 校验(CRC/签名)
[SPI Flash 分区] A/B 分区写入(A下载,B运行)
   ↓   校验通过 → 切启动分区 → 重启
[新固件启动]   失败则回退旧分区
```

### 组件开关

- `RT_USING_MQTT` / `RT_USING_WEBCLIENT` / `RT_USING_MODBUS` / `RT_USING_COAP` / `RT_USING_TLS`(mbedTLS)
- `RT_USING_FLASHDB` / `RT_USING_OTA` 等

### 工程场景/坑

- **症状**：MQTT 连不上/断连；上传失败；OTA 失败重启后变砖。
- **根因/对策**：网卡/IP 未就绪（先 `ifconfig`/`ping`）；MQTT broker 地址/账号/主题配错；TLS 证书/时间问题；OTA 分区/校验/切换逻辑错误（务必 A/B + 校验 + 回退）。

### 进阶追问链

1. **Q：MQTT 和 HTTP 怎么选？** → 大量设备/要实时可靠/断线重连 → MQTT（发布订阅、QoS）；简单请求-响应/拉取接口 → HTTP。上云常选 MQTT。
2. **Q：OTA 怎么做保证不“变砖”？** → **A/B 双分区**下载，校验（CRC/签名）通过后才切换启动分区；失败回退旧分区；下载/校验/写分区断点续传。
3. **Q：CoAP 与 HTTP 区别？** → CoAP 基于 **UDP**、更轻、适合受限/低功耗设备的一问一答；HTTP 基于 TCP、功能全但重。资源极少/省电用 CoAP。
4. **Q：为什么上云还要 TLS？** → 保证数据**机密性/完整性/身份认证**（防止泄露/篡改/伪造）；用 mbedTLS 给 MQTT/HTTP 加证书与加密。

> 📌 一句话记忆：**RT-Thread 应用协议＝基于 SAL/socket 的组件：上云 MQTT(发布订阅/QoS/断线重连)、Web 用 HTTP、现场用 Modbus(主从寄存器)、省资源用 CoAP(UDP)、升级用 OTA(A/B+校验+回退)；常配 TLS(mbedTLS)+FlashDB；链路＝传感器→设备框架→FlashDB→SAL/netdev+LwIP→MQTT/HTTP→云。**
