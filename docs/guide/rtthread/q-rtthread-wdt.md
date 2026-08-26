---
title: 看门狗设备框架（IWDG/WWDG）
id: rtthread-wdt
category: rtthread
difficulty: 3
tags: [RT-Thread, 看门狗, 设备框架, IWDG, WWDG]
company: [大疆, 智驾, 汽车电子]
keywords: RT-Thread 看门狗 rt_wdt IWDG WWDG 喂狗 设备框架 复位
answer: |
  **结论先行**：看门狗（Watchdog）是一个**独立计时器，超时未“喂狗（重载计数值）”就复位/中断**，用于在程序卡死/跑飞时自动恢复。RT-Thread 把它也做成一个**设备（`rt_wdt`）**，用 `rt_device_find/open/control` 使用。

  ### 两种看门狗
  | 类型 | 特点 | RT-Thread 设备 |
  |---|---|---|
  | **独立看门狗（IWDG）** | 独立时钟（LSI），主时钟异常也能复位 | `wdt` 设备，超时内喂狗 |
  | **窗口看门狗（WWDG）** | 用 PCLK 时钟；喂狗须在**窗口**内（太早太晚都复位） | `wdt` 设备，配上下限 |

  ### RT-Thread 用看门狗设备
  ```c
  rt_device_t wdt = rt_device_find("wdt");
  rt_device_control(wdt, RT_DEVICE_CTRL_WDT_SET_TIMEOUT, &timeout); // 设超时
  rt_device_control(wdt, RT_DEVICE_CTRL_WDT_START, RT_NULL);        // 启动
  // 周期喂狗:
  rt_device_control(wdt, RT_DEVICE_CTRL_WDT_KEEPALIVE, RT_NULL);
  ```

  ### RTOS 里怎么用（要点）
  - **喂狗点要反映“系统健康”**：让**关键任务上报心跳**，由**监控任务汇总后喂狗**（别在 idle/ISR 里喂，会掩盖卡死）。
  - **喂狗间隔 < 超时**，留余量；**窗口看门狗**要求落在窗口内，防空转（死循环骗狗会因“太早”被复位）。
  - 配合 **`rt_thread` 心跳**：`rt_wdt` 喂狗任务检查所有关键任务的心跳位，都到才 `KEEPALIVE`，某个任务卡死 → 不喂 → 复位。
  - 复位后读 **RCC 复位标志（`RCC->CSR`）**区分电源/软件/看门狗复位，据此做不同初始化或崩溃恢复。
why: |
  这一题是“**RT-Thread 怎么把看门狗也做成设备**”+“**RTOS 下看门狗的正确喂法**”的结合：
  - **为什么做成 `rt_wdt` 设备**：看门狗也是外设，用统一设备接口（`find/open/control`）配置与喂狗，换芯片/不同看门狗只改驱动，应用不变——体现**设备框架统一性**。
  - **为什么要用“心跳汇总”**：RTOS 是**多任务**，单点喂（某任务/主循环）只反映那一个点活；关键任务卡死时其它线程照喂，看门狗失效。**每个关键任务上报心跳，汇总后喂**才能覆盖全系统、还能定位“哪个任务卡死”。
  - **为什么别在 idle/ISR 喂**：idle 只要调度器在就能跑，业务卡死它照喂 → 掩盖故障；ISR 同理。
  - **为什么窗口看门狗能防空转**：它要求喂狗**落在窗口内**，死循环里“快速喂狗”会因**太早**被复位——防“绕圈骗狗”。
  - 这一题答好，说明既懂**看门狗设备框架**，又懂**RTOS 里看门狗的“健康语义”**。
---
<FlashCard />

## 深读

### STM32 看门狗关键点

| 项 | IWDG（独立） | WWDG（窗口） |
|---|---|---|
| 时钟 | 独立 LSI(~40kHz) | PCLK |
| 喂狗 | `IWDG_KR=0xAAAA` | `WWDG_CR` 值在上下限之间 |
| 关键 | 定时喂、超时复位 | **窗口**内喂（太早/太晚都复位） |
| 复位标志 | `RCC->CSR.IWDGRSTF` | `RCC->CSR.WWDGRSTF` |

- RT-Thread 通过 `rt_wdt` 设备把这些封装成 `RT_DEVICE_CTRL_WDT_SET_TIMEOUT/START/KEEPALIVE`。

### RTOS 心跳喂狗结构

```
[关键任务A/B/C] 每周期置位心跳位
      │
[看门狗监控任务] 检查 心跳位都在?
      │ 都在 → rt_device_control(wdt, KEEPALIVE, NULL) + 清位
      │ 某个没到 → 不喂 → 超时 → 复位 → 查 RCC 复位标志
```

### 工程场景/坑

- **症状**：系统偶尔莫名复位，或某任务卡死但没被看门狗抓出。
- **根因/对策**：喂狗选在 idle/ISR/主循环最前（掩盖卡死）；没用“心跳汇总”；超时设太短（误复位）或太长（抓不到）。读 `RCC->CSR` 判断是否看门狗复位；改为**关键任务心跳 + 汇总喂**；间隔留余量。

### 进阶追问链

1. **Q：RT-Thread 里看门狗怎么“做成设备”？** → 用 `rt_device` 框架：`rt_device_find("wdt")`，用 `rt_device_control(...SET_TIMEOUT/START/KEEPALIVE...)` 配置与喂狗；BSP 实现 `ops`（设超时/启动/喂狗/读复位状态）。
2. **Q：为什么 RTOS 要用“心跳汇总”喂狗？** → RTOS 多任务，单点喂只反映那一个点；关键任务卡死其它线程照喂会失效。用关键任务心跳 + 监控任务汇总喂，能覆盖全系统并定位“哪个任务卡了”。
3. **Q：为什么不在 idle/ISR 喂狗？** → idle 只要调度器在就能跑；业务卡死时它照喂 → 掩盖故障；ISR 同理。喂狗点应放在“确认关键逻辑推进到某步”之后。
4. **Q：怎么区分看门狗复位和上电复位？** → 读 `RCC->CSR` 的 `IWDGRSTF`/`WWDGRSTF`/`PORRSTF`；据此决定是否恢复崩溃现场/做不同初始化。

> 📌 一句话记忆：**RT-Thread 看门狗＝做成 rt_wdt 设备(rt_device_find/control: SET_TIMEOUT/START/KEEPALIVE)；IWDG 独立时钟超时复位，WWDG 需窗口内喂(防空转)；RTOS 下用“关键任务上报心跳+监控任务汇总喂”，别在 idle/ISR 喂；复位后读 RCC->CSR 区分复位源；间隔留余量。**
