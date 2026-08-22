---
title: Linux 内核模块与参数
id: kernel-module
category: linux
difficulty: 3
tags: [Linux, 内核模块, 驱动]
company: [海康威视, 中兴]
keywords: 内核模块 模块加载 参数 module_param init exit 符号导出
answer: |
  **内核模块**是**可动态加载/卸载**到内核的代码（`.ko`），用于扩展内核功能而不必重编内核。用 `insmod`/`modprobe` 加载，`rmmod` 卸载。
  **结构**：`module_init(fn)` 注册**初始化函数**（加载时执行，常做资源申请/注册驱动），`module_exit(fn)` 注册**清理函数**（卸载时释放）。`MODULE_LICENSE`、`MODULE_AUTHOR`、`MODULE_DESCRIPTION` 声明元数据。
  **参数**：用 `module_param(name, type, perm)` 声明**可加载参数**（供 `insmod xxx.ko param=val` 或 `/sys/module/.../parameters/` 设置），`perm` 指定 `/sys` 权限。
  **符号导出**：用 `EXPORT_SYMBOL`/`EXPORT_SYMBOL_GPL` 让其他模块能引用它的符号。
  上下文：模块代码运行在**内核态**（特权级），可访问内核内存/硬件，但**不能**用用户态库，需谨慎（泄漏/崩溃会拖垮系统）。
why: |
  **动态模块化**让内核保持核心最小的同时**按需加载驱动/功能**：开发期改驱动不用反复重编内核、可 `insmod/rmmod` 快速迭代；生产环境按需挂载（如文件系统、字符设备驱动）。
  理解模块加载/卸载、参数、符号导出，就能看懂驱动源码与“为什么 `insmod` 后设备出现/`rmmod` 后消失”，也是内核开发基本功。
---
<FlashCard />

## 深读

### 经典模块骨架

```c
#include <linux/module.h>
#include <linux/init.h>

static int my_param = 42;
module_param(my_param, int, 0644);       // 可加载参数

static int __init my_init(void){
  pr_info("my module init, param=%d\n", my_param);
  // 申请资源/注册驱动...
  return 0;
}
static void __exit my_exit(void){
  pr_info("my module exit\n");
  // 释放资源...
}
module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

### 加载/卸载命令

```bash
insmod my.ko param=100    # 加载（可带参数）
modprobe my               # 自动解析依赖的加载
rmmod my                  # 卸载
lsmod                     # 查看已加载模块
modinfo my.ko             # 查看元数据/参数
```

### 模块参数

- `module_param(name, type, perm)`：`name` 变量名、`type`（`int`/`charp`/`bool` 等）、`perm`（`/sys` 权限，如 `0644`）。
- 可通过 `insmod my.ko name=value` 设置，或运行时改 `/sys/module/my/parameters/name`（取决于 perm）。
- `module_param_array` 支持数组参数。

### 符号导出

- `EXPORT_SYMBOL(f)` 让其他内核模块可引用 `f`；`EXPORT_SYMBOL_GPL` 仅 GPL 模块可用。
- 不同模块之间的“接口”就靠导出符号。

### 内核态 vs 用户态

- **内核态**：直接访问内核内存/硬件，**特权级高**；但**没有**用户态的安全/隔离，一段崩溃（空指针/越界）可能整机崩（oops/panic）。
- 模块代码：用**内核 API**（`kmalloc`、`printk`/`pr_info`、`module` 相关），不能用用户态 `libc`/`stdio`。

### 常见追问

- 为什么能不改内核就加驱动？——模块是动态链接进内核的代码，`insmod` 加载、`rmmod` 卸载。
- `module_init/exit` 干什么？——注册加载/卸载钩子，分别做资源申请/释放。
- 模块崩溃会怎样？——内核态崩溃可能 oops/panic，影响整机；所以模块要谨慎。
- 参数怎么从用户态传入？——`insmod xxx.ko param=val` 或 `/sys/module/xxx/parameters/param`。

> 📌 一句话记忆：**内核模块=可动态加载/卸载的内核代码（insmod/rmmod）；module_init/exit 管生命周期，module_param 配参数，EXPORT_SYMBOL 共享符号。**
