---
title: 项目一·边缘 AI：INT8 量化 + tensor arena（Q→A）
id: project1-edgeai-quant
category: training
difficulty: 5
tags: [项目一, 边缘AI, INT8, tensor arena]
company: [大疆, 汇顶]
keywords: INT8 量化 scale zero_point 校准 tensor arena 精度损失
answer: |
  **Q：你用了 TFLM INT8 量化，说说 INT8 量化是什么？怎么校准？精度损失哪来？tensor arena 是什么、怎么规划？**

  **A（你怎么答）：**
  **量化本质**：把模型权重/激活从 float32 映射到 int8，用一对 **scale / zero_point** 做线性映射 + 舍入：
  `q = round(real / scale) + zero_point`，反量化 `real = scale*(q - zero_point)`。**scale 由数值范围定**，`zero_point` 对齐整数零点。

  **怎么校准**：激活范围在推理前未知，用一组**代表性校准数据**先跑一遍模型，统计**每层激活的数值分布**，再挑阈值定 scale——用 **min/max**（简单但怕离群点）或 **KL 散度**（挑「量化前后分布失真最小」的阈值，更准）。我做的「**训 3 候选 + logits 比分**」就是在**挑失真最小**的那个量化结果。

  **精度损失**：来自**舍入**、**范围过大把小数压扁**、**某些敏感层（BN/残差）**。缓解：**KL 校准**、**per-channel（每通道一组 scale）**、**量化感知训练 QAT**。

  **tensor arena**：TFLM 推理时用的**一块预分配、固定大小的临时 RAM**，存各层中间激活张量，**运行时复用**，**大小 = 模型峰值内存**。我把它放**片内 RAM**（快、确定），这样**推理不动态 malloc、无碎片、内存可预测**——这就是我简历里「tensor arena 内存规划」。

  **滑窗分类**：传感器是时序信号，不能单帧判类，用**300 帧滑窗**当一次输入、窗口滑动复用，输出各类别 **logits** 取**最大得分**定类别。
why: |
  这题专门考「**你是不是真做过量化**」。能讲出**scale/zero_point 公式、校准用 KL、精度损失与 QAT/per-channel、tensor arena 预分配复用**，才算懂；只背「INT8 更省」会被追问到崩。这是你项目里**答得好就能赢、答不好就全输**的一道题。
---
<FlashCard />

## 深读

### 量化公式（会写）
```
scale = (real_max - real_min) / (q_max - q_min)
q = round(real / scale) + zero_point
real = scale * (q - zero_point)
```

### 校准：min/max vs KL
- **min/max**：取该层激活的极大/极小定范围。简单，但**离群点会把范围拉大、其他值压扁 → 精度差**。
- **KL 散度**：在多个候选阈值里，选**量化前后分布失真最小**的那个（TensorFlow 经典做法）。长尾/离群数据更稳。

### 精度损失来源与缓解
| 来源 | 缓解 |
|---|---|
| 舍入 | QAT（训练时模拟量化损失） |
| 范围过大 | KL、去离群、per-channel |
| 敏感层 | 逐层校准、混合精度 |
| per-tensor 粗糙 | **per-channel**（每输出通道一组 scale） |

### tensor arena 为什么放片内 / 为什么不用 malloc
- **预分配 + 复用**：不同层中间张量生命周期交错，可共用一块峰值区 → 省内存、无碎片、时间确定。
- **放片内 RAM**：快、确定、少走外部总线。
- 这正是「**内存池/静态分配**」思想（`c/q-memory-pool`、`c/q-memory-layout`）。

### 把八股接回项目
答完加一句：「**tensor arena 这本质是嵌入式内存规划，跟我框架的 bufpool 一样都是『预分配代替 malloc』，保证长跑稳定。**」
