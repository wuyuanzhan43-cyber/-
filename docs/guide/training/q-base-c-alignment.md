---
title: 底子·结构体内存对齐
id: base-c-alignment
category: training
difficulty: 3
tags: [底子, C, 内存对齐, 结构体]
company: [华为, 中兴]
keywords: 内存对齐 结构体 字节对齐 填充 大小
answer: |
  **内存对齐**：为了让 CPU 高效访问（很多架构要求特定类型按字节对齐，否则可能**未对齐访问导致性能下降甚至 Fault**），编译器会在结构体成员间**插入填充字节（padding）**，使每个成员的起始地址对齐到 `sizeof(该类型)` 的倍数，并让**结构体总大小对齐到最宽成员的对齐值（或成员中最大对齐）**。

  **怎么算结构体大小**：
  1. 每个成员从其**对齐边界**开始放；
  2. 成员间插入 padding 补到对齐；
  3. 结构体总大小 = **最大成员对齐值的整数倍**。

  **例子（常用）**：
  ```c
  struct{ char a; int b; }      // 4+padding: char(1)+3 + int(4) = 8
  struct{ char a; char b; int c; } // 1+1+2 + int(4) = 8
  ```
  **注意**：把成员按**从大到小**排列往往能**减少 padding、省内存**。

  **`#pragma pack`/`__attribute__((packed))`**：紧凑对齐（省内存，但可能**未对齐访问**，网络协议/寄存器结构体常用来避免 padding 和协议字段冲突）。
why: |
  嵌入式常**手动构造结构体对应寄存器/协议帧**，对齐直接决定**结构体大小、字段偏移、能否和协议字段一一对应**（用 padding 会错位）。能算结构体大小、知道**为什么会有 padding、怎么省**，是嵌入式 C 底子；再加上 `packed` 的取舍，面试就稳。
---
<FlashCard />

## 深读

### 算大小示例
```c
struct A { char a; int b; short c; };  // char(1)+3 + int(4) + short(2)+2 = 12
struct B { int b; short c; char a; };  // int(4) + short(2)+1 + char(1)+0 = 8  ← 省内存
```
- 按最大对齐排序成员，padding 更少。

### 常见追问
- 为什么结构体有填充？——对齐要求，让成员起始地址符合对齐边界，否则 CPU 访问慢/出错。
- 怎么避免 padding？——成员从大到小排、或 `packed`（紧凑，但可能未对齐访问）。
- 结构体大小怎么算？——从各自对齐边界放，成员间补 padding，总大小对齐到最大对齐的整数倍。
- 网络协议/寄存器结构体能加 padding 吗？——不能，常用 `packed`/`#pragma pack(1)`，否则字段错位。

> 📌 一句话：**对齐=让成员从对齐边界开始、插 padding；结构体总大小=最大对齐的整数倍；成员从大到小排能省；协议/寄存器结构用 packed 去 padding。**
