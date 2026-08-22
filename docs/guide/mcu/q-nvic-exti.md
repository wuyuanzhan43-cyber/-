---
title: STM32 中断配置（NVIC/EXTI）
id: nvic-exti
category: mcu
difficulty: 3
tags: [STM32, 中断, EXTI, NVIC]
company: [汇顶, 中兴]
keywords: EXTI NVIC 中断配置 边沿 优先级 清标志
answer: |
  **STM32 中断流程**：外设事件 → **EXTI（外部中断/事件控制器，边沿检测）** → **NVIC（使能+优先级）** → 跳转到**中断服务函数（ISR）**。
  **配置步骤**（以 GPIO 外部中断为例）：
  1. **开 GPIO 时钟**（`__HAL_RCC_GPIOA_CLK_ENABLE` 等），配置 GPIO 为**输入**。
  2. **配置 EXTI**：把 GPIO 映射到 EXTI 线（`SYSCFG_EXTICR`）、选**触发边沿**（上升/下降/双沿）、使能该类 EXTI 触发。
  3. **配置 NVIC**：使能对应**中断号**（`HAL_NVIC_EnableIRQ`）、设置**优先级分组**（抢占/子优先）与优先级。
  4. **写 ISR**：`EXTIx_IRQHandler` 里判断线、**清标志**（`EXTI->PR`/`HAL_GPIO_EXTI_IRQHandler`）、做处理（短、可重入）。
  **要点**：**优先级分组**统一设置（抢占决定嵌套）；**进入 ISR 清标志**否则反复触发；中断里**短、不阻塞**；优先级数值小=高。
why: |
  中断让 MCU"**事件驱动、不轮询**"，提高响应与效率。配置 **EXTI（边沿触发）+ NVIC（优先级/使能）+ ISR（处理）** 是基本功。
  重点：**优先级分组**（抢占/子优先，关系到**中断嵌套**）、**清中断标志**（否则死循环/反复触发）、**ISR 短且可重入**（把重活丢主循环/任务），以及**防抖动**（按键需消抖）。
---
<FlashCard />

## 深读

### 中断链路

```
外设事件 → EXTI(边沿检测) → NVIC(使能+优先级) → 向量表 → ISR
```

- **EXTI**：外部中断控制器，检测边沿（上升/下降/双沿），映射 GPIO。
- **NVIC**：使能中断、设优先级（抢占/子优先）。

### 配置要点（HAL 示例）

```c
__HAL_RCC_GPIOA_CLK_ENABLE();
GPIO_InitTypeDef g = { .Pin=GPIO_PIN_0, .Mode=GPIO_MODE_IT_RISING };
HAL_GPIO_Init(GPIOA, &g);
HAL_NVIC_SetPriority(EXTI0_IRQn, 2, 0);   // 抢占2,子0
HAL_NVIC_EnableIRQ(EXTI0_IRQn);
void EXTI0_IRQHandler(void){ HAL_GPIO_EXTI_IRQHandler(GPIO_PIN_0); }
```

- **Mode=GPIO_MODE_IT_RISING**（上升沿触发）。
- **清标志**：`HAL_GPIO_EXTI_IRQHandler` 自动清；手动清 `EXTI->PR`。
- **优先级**：`HAL_NVIC_SetPriority`（抢占、子优先）。

### 优先级分组与嵌套

- `NVIC_PriorityGroupConfig` 设置分组（如 4 位抢占/4 位子优先）。
- **抢占优先级**决定**是否嵌套打断**；子优先只决定同抢占下的顺序。
- 数值小=高。

### 常见坑

- **忘清标志** → 反复触发/死循环。
- **优先级分组不一致** → 嵌套行为混乱。
- **ISR 里做重活/阻塞** → 实时性差、丢事件。
- **按键抖动** → 需要**软件消抖/去抖**。

### 常见追问

- 中断和轮询区别？——中断事件驱动、省 CPU；轮询占 CPU、实时差。
- EXTI 干嘛？——检测 GPIO 边沿，触发中断。
- 优先级分组？——抢占(可嵌套)+子优先(同抢占顺序)。
- 为什么 ISR 要短？——拖长会丢中断/影响实时；短+可重入，重活丢主循环/任务。

> 📌 一句话记忆：**中断=外设事件→EXTI(边沿)→NVIC(优先级/使能)→ISR；配 GPIO/EXTI/优先级，进场清标志、ISR 短且可重入，按键要消抖。**
