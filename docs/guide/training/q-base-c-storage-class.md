---
title: 底子·static / const / extern 作用
id: base-c-storage-class
category: training
difficulty: 3
tags: [底子, C, static, const, extern]
company: [华为, 中兴]
keywords: static const extern 链接 作用域 生命周期
answer: |
  **static**：
  - **局部 static**：**生命周期为整个程序**（存 .data/.bss），但**作用域仅限该函数**——跨多次调用**保留值**；**不可重入**（多次调用共享这份状态）。
  - **全局 static**：**作用域限本文件**（内部链接），别的文件看不到，**防止名字冲突**；仍可 `.data`/`.bss`。
  - **static 函数**：**只在本文件可见**，不可跨文件调用（内部链接）。

  **const**：**只读**。但注意 `const int *p`（指向 const 的指针，指针可变、*p 不可改）vs `int * const p`（指针本身 const，*p 可改）vs `const int * const p`（都不可改）。const 变量**仍可能被外部改**（如硬件寄存器、用某种方式），配合优化。

  **extern**：**声明**变量/函数**定义在别处**（跨文件），只声明不定义。**c 语言用 extern** 声明外部符号，**防止重复定义**。多次 `extern int x;` 不重复分配，只引一次定义。

  **区别一句话**：**static=文件/函数内部可见 + 延长生命周期；const=只读（分指针/值）；extern=引用别处定义，避免重复定义。**
why: |
  这三个是嵌入式里**控制「作用域、生命周期、链接属性、只读」**的基础工具。能说清 **static 局部（保留值但不可重入）、static 全局/函数（文件内私有）、const 三种指针、extern 跨文件声明**，就掌握了 C 的「组织与封装」底子，也是面试高频。
---
<FlashCard />

## 深读

### const 三种指针（必考）
```c
const int *p;      // 指向 const 的指针：*p 不可改，p 可变
int * const p;     // 指针本身 const：p 不可改，*p 可改
const int * const p; // 都不可改
```

### 常见追问
- static 局部变量和普通局部区别？——static 生命周期到程序结束、保留值；普通每次调用重建。
- 为什么 static 局部不可重入？——多任务/中断共享同一份 static 状态 → 竞态。
- const 能防被外部改吗？——防**编译器/代码里误改**；硬件寄存器可以被外部改（所以要配 volatile）。
- extern 和 include 区别？——extern 声明别处定义；include 把定义/声明写进来，防止重复定义常用 extern 前置声明。

> 📌 一句话：**static=文件内私有 + 延长生命周期；const=只读（注意指针/值之分）；extern=跨文件引用已定义符号。**
