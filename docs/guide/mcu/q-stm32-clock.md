---
title: STM32 时钟树
id: stm32-clock
category: mcu
difficulty: 4
tags: [STM32, 时钟, 外设]
company: [汇顶, 中兴]
keywords: 时钟树 RCC PLL HSE HSI 分频 AHB APB SYSCLK 外设时钟
answer: |
  STM32 的时钟由 **RCC（复位与时钟控制）** 管理，时钟树大致：
  1. **时钟源**：
     - **HSE**：外部高速晶振（如 8MHz）。
     - **HSI**：内部高速 RC 振荡器（约 8/16MHz，无需晶振但精度较低）。
     - **LSE/LSI**：低速晶振（如 32.768kHz，RTC）、低速 RC。
  2. **PLL**：把 HSE/HSI **倍频**到**系统时钟（SYSCLK）**（如 8MHz→72MHz/168MHz）。
  3. **AHB 预分频**：SYSCLK → **HCLK**（CPU/总线/DMA 时钟）。
  4. **APB1/APB2 预分频**：HCLK → **PCLK1 / PCLK2**（外设时钟；APB 分频≠1 时，定时器时钟再×2）。
  5. **各外设**：在对应总线上**单独使能**时钟（`RCC_APB2PeriphClockCmd`/`__HAL_RCC_GPIOA_CLK_ENABLE`），部分外设（ADC、SDIO、RTC）有**独立时钟源**。
  **为何重要**：**外设不开时钟不工作、配错分频计时不准、主频高则快但耗电**。`SystemInit`/`HAL_RCC` 配置时钟树，是移植与性能/功耗权衡的核心。
why: |
  每个外设都由**对应总线/分频后的时钟**驱动，默认很多是**关闭/低速**。不配时钟树就会：
  - **外设不工作**（没开对应时钟/分频错）。
  - **定时器/UART/PWM 频率不对**（总线频率或分频配错）。
  - **功耗高**（主频/总线频率过高）。
  所以初始化第一件事就是**配好时钟树**：选时钟源、PLL 倍频、AHB/APB 分频、开外设时钟。理解它才能排查“为什么串口波特率不对、为什么定时器不准、为什么外设不动”。
---
<FlashCard />

## 深读

### 时钟树简化

```
HSE/HSI ──→ PLL ──→ SYSCLK ──→ AHB分频 → HCLK(CPU/总线/DMA)
                                 │
                                 ├── APB1分频 → PCLK1(外设) → 定时器×2(若分频≠1)
                                 └── APB2分频 → PCLK2(外设) → 定时器×2
各外设: 在 APB1/APB2/AHB 上，需单独使能
```

- **SYSCLK**：系统时钟（CPU 主频）。
- **HCLK**：AHB 总线（CPU/存储/DMA）。
- **PCLK1/PCLK2**：APB1/APB2 外设总线（低速/高速外设分组）。
- **定时器**：APB 分频≠1 时，定时器时钟 = PCLK × 2（避免定时器太慢）。

### 典型示例（72MHz）

```
HSE=8MHz → PLL ×9 → SYSCLK=72MHz → AHB 分频 1 → HCLK=72MHz
                                  → APB2 分频 1 → PCLK2=72MHz(定时器×2? 这里分频1所以=72)
                                  → APB1 分频 2 → PCLK1=36MHz(定时器×2=72MHz)
```

- APB1 通常分频 2（PCLK1=36M），APB2 分频 1（PCLK2=72M）。

### 外设时钟使能（重要）

- 默认很多外设时钟**关闭**；用 `RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE)` / `__HAL_RCC_GPIOA_CLK_ENABLE()` 打开。
- 不开时钟，外设寄存器不响应/不工作。

### RTC/看门狗/独立时钟

- **RTC** 用 LSE（32.768kHz）低速晶振。
- **独立看门狗（IWDG）** 用独立低速时钟（LSI）。
- 这些不依赖主 PLL，掉电/低功耗仍可走时/看门狗。

### 常见追问

- 为什么串口波特率不对？——PCLK 分频或波特率分频器配错。
- 为什么外设不工作？——外设时钟没使能 / 对应总线/分频没配。
- 主频越高越好吗？——不一定，功耗发热、时序限制；要在性能与功耗间权衡。
- HSE 和 HSI 区别？——HSE 外部晶振精度高；HSI 内部 RC 无需晶振但精度较低、随温度漂。

> 📌 一句话记忆：**时钟树=时钟源(HSE/HSI)→PLL 倍频→SYSCLK→AHB/APB 分频→外设时钟(需单独使能)；配错则外设不动/计时不准/功耗高。**
