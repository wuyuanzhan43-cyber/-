---
title: 指针与 const（const 指针 vs 指针常量）
id: pointer-const
category: c
difficulty: 2
tags: [c, 指针, 关键字]
company: [海康威视, 汇顶]
keywords: const 指针 常量指针 指向常量的指针 可读性
answer: |
  关键看 `const` 修饰的是「指针本身」还是「所指的东西」：
  - `const int *p` / `int const *p`：**指针指向的内容是常量**，`*p` 不可改，但 `p` 可以改指向。
  - `int * const p`：指针本身是常量，`p` 一旦初始化就不可再指向别处，但 `*p` 可改。
  - `const int * const p`：两者都不可改。
  记忆法：`const` 靠近谁就锁谁。`const` 在 `*` 左侧→锁内容；在 `*` 右侧→锁指针。
why: |
  这是区分「不可变的指针」与「指向不可变值的指针」的语法点，也是嵌入式里指针形参写法的核心。
  函数形参写成 `const int *buf` 表示“我用你的数据但绝不改它”，能防止误写、让调用方放心传入**只读的常量区/寄存器/const 数据**，让编译器能做更强优化。是编码规范（如 MISRA）里推崇的写法。
---
<FlashCard />

## 深读

### 两种写法的对照

| 写法 | 内容不可改？ | 指针不可改？ | 读法 |
|---|---|---|---|
| `const int *p` | ✅ | ❌ | pointer to const int（指向常量的指针） |
| `int const *p` | ✅ | ❌ | 同上，`const` 修饰 `int` |
| `int * const p` | ❌ | ✅ | const pointer to int（指针常量） |
| `const int * const p` | ✅ | ✅ | 又是指向常量的指针、又是指针常量 |
| `int const * const p` | ✅ | ✅ | 同上 |

> 读法口诀：从内往外读，`const` 后面跟的最近类型就是它锁定的对象。

### 为什么常用在函数形参

```c
void foo(const int *buf, size_t len) {
  buf[0] = 1;   // ❌ 编译错误，buf 指向的内容是 const
}
```

好处：

1. **防止误写**：函数内部想改数据会直接编不过。
2. **表达意图**：调用方看到 `const int *` 就知道这个函数“只读不写”，可以放心把 `const` 数据、字符串字面量、只读寄存器地址传进去。
3. **优化机会**：明确只读能让编译器更激进地优化（如常量传播、消除重复加载）。

### 嵌入式场景

- 指向 **寄存器/外设只读地址**，用 `volatile const` 组合。
- 函数形参传 **大缓冲（如图像、日志、固件表）** 用 `const` 避免意外改动。
- **`const` 与 `volatile` 可共存**：`const volatile int *reg`（内容是只读的硬件寄存器，值是易变的）——这在 MMIO 场景很典型。

### 易错点（追问）

- `char *s = "hello";` 在 C 中合法但**改字符串字面量是未定义行为**；更稳的写法是 `const char *s = "hello";`。
- 数组名作函数形参会退化为指针，`const int arr[]` 与 `const int *arr` 等价，都**锁内容不锁指针**。

> 📌 一句话记忆：**`const` 在 `*` 左→锁值，在 `*` 右→锁针；函数形参多用 `const int *` 表达“只读”。**
