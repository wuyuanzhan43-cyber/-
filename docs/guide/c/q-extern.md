---
title: extern 与头文件的作用
id: extern
category: c
difficulty: 2
tags: [c, 关键字, 声明, 头文件]
company: [中兴, 华为]
keywords: extern 声明 定义 头文件 include 链接 extern C
answer: |
  **`extern`** 用于**声明**一个在别处（其他编译单元/文件）定义的**变量或函数**，告诉编译器“这个名字存在、类型是什么”，但不定义它。它与“定义”的区别：
  - **声明（declaration）**：只说明名字与类型，不分配存储（如 `extern int x;`、函数原型）。
  - **定义（definition）**：真正分配存储/实现（如 `int x = 0;`、`void f(){}`）。
  **头文件（`.h`）**：放**声明与共享定义**（函数原型、`extern` 变量声明、宏、`typedef`、结构体定义），被多个 `.c` `#include`，实现“一处声明、多处使用”、避免重复定义与错误。
  要点：
  - 头文件里变量用 **`extern` 声明**，真正的定义放**一个 `.c`**（否则多个 `.c` 都定义 → 链接重定义）。
  - **`extern "C"`**（C++）让函数用 C 链接方式，供 C/C++ 互相调用（避免 name mangling）。
  - 头文件用 **`#ifndef/#define`** 或 **`#pragma once`** 防重复包含。
why: |
  编译单元是**独立的 `.c` 文件**，互相看不到对方的名字；**跨文件共享**靠「头文件里 `extern` 声明 + 对应 `.c` 定义」链接起来。这实现了**模块化/接口分离**：`.h` 是接口，`.c` 是实现。
  没搞清会踩坑：**多个 `.c` 各自定义同名全局 → 链接重定义**；或**头文件定义变量被多次包含 → 重复定义**；或 C/C++ 混用时报链接错误（name mangling）。
---
<FlashCard />

## 深读

### 声明 vs 定义

```c
extern int g;      // 声明：g 存在，类型 int，不分配存储
int g = 0;         // 定义：真正分配并初始化

extern void f(void);  // 函数原型（声明）
void f(void){}        // 定义（实现）
```

### 头文件怎么写才安全

```c
// my.h
#ifndef MY_H
#define MY_H
extern int g;                 // 共享变量：只声明
int add(int, int);            // 函数原型
typedef struct {...} S;       // 类型定义
#endif
```

```c
// a.c
#include "my.h"
int g = 0;                    // 变量真正在这里定义一次
```

- 变量定义只在**一个 `.c`**，其余用 `extern` 声明。
- 函数可以只在 `.h` 放原型，实现放一个 `.c`。

### extern "C"

```c
#ifdef __cplusplus
extern "C" {
#endif
void c_func(void);
#ifdef __cplusplus
}
#endif
```

- C++ 对函数做 **name mangling**（改名），C 不做；`extern "C"` 让 C++ 里的函数以 C 方式命名，从而能与 C 编译的代码链接。

### 常见追问

- `extern` 和定义的区别？——`extern` 只声明不分配存储；定义分配存储（或实现）。
- 为什么头文件放 `extern` 而非定义？——多个 `.c` `#include`，若放定义会重复定义（链接错）。
- 头文件防重复包含？——`#ifndef/define` 或 `#pragma once`。
- 什么是 `extern "C"`？——C++ 里让函数用 C 链接，便于 C/C++ 互调。

> 📌 一句话记忆：**声明(extern/原型)不分配存储，定义才分配；头文件放声明，变量/函数的真正实现放一个 .c；extern "C" 让 C/C++ 互链。**
