---
title: 字符设备驱动开发流程
id: char-driver
category: linux
difficulty: 4
tags: [Linux, 驱动, 字符设备]
company: [海康威视, 中兴]
keywords: 字符设备 file_operations 主设备号 cdev register_chrdev 设备节点
answer: |
  字符设备驱动开发的核心是**实现 `struct file_operations`**（`open/read/write/ioctl/release` 等函数指针），并**注册字符设备**给内核。
  典型流程（基于 `cdev` 方式）：
  1. **分配设备号**：`register_chrdev_region`/`alloc_chrdev_region`（主/次设备号）。
  2. **初始化 `cdev`**：`cdev_init(&cdev, &fops)`，`cdev_add` 把设备与设备号**绑定**。
  3. **创建/关联设备节点**：`class_create` + `device_create` 在 `/dev` 下生成节点（或 `mknod`）。
  4. **实现 `file_operations`**：`read/write/ioctl/open/release`，内部对应**硬件操作**（读寄存器、buffer、上/下电）。
  5. **卸载**：`cdev_del`、`unregister_chrdev_region`、`device_destroy`/`class_destroy`。
  用户态 `open("/dev/xxx")` → 走到驱动 `open`；`read/ioctl` 同理。**设备和 `file_operations` 绑定**，实现“设备即文件”。
why: |
  字符设备是 Linux 里最简单、最常用的驱动形态（GPIO、串口、LED、传感器等）。**核心是“把硬件的 open/read/write/ioctl 映射成 file_operations”**，并通过设备号/cdev/设备节点把它暴露给用户态。
  理解这套流程（设备号 → cdev → fops → /dev 节点），就能写出一个最小可用的字符设备驱动，也是嵌入式驱动面试的必考。
---
<FlashCard />

## 深读

### 关键结构

```c
struct file_operations {
  int  (*open)(struct inode*, struct file*);
  ssize_t (*read)(struct file*, char __user*, size_t, loff_t*);
  ssize_t (*write)(struct file*, const char __user*, size_t, loff_t*);
  long (*ioctl)(struct file*, unsigned int, unsigned long);
  int  (*release)(struct inode*, struct file*);
};
```

### 最小字符设备驱动（骨架）

```c
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>

static int my_open(struct inode* in, struct file* f){ return 0; }
static ssize_t my_read(struct file* f, char __user* buf, size_t n, loff_t* off){
  // copy_to_user(buf, ...)
  return 0;
}
static const struct file_operations my_fops = { .open=my_open, .read=my_read };

static int __init my_init(void){
  // 1. 分配设备号  2. cdev 注册  3. device_create 建节点
  return 0;
}
static void __exit my_exit(void){
  // 清理/注销
}
module_init(my_init); module_exit(my_exit);
```

### 流程要点

| 步骤 | 函数 | 作用 |
|---|---|---|
| 分配设备号 | `alloc_chrdev_region` / `register_chrdev_region` | 拿主/次设备号 |
| 注册 cdev | `cdev_init` + `cdev_add` | 绑定 fops 与设备号 |
| 自动建节点 | `class_create` + `device_create` | `/dev/xxx` 节点 |
| 实现操作 | `open/read/write/ioctl` | 对应硬件操作 |
| 卸载释放 | `cdev_del` / `unregister_chrdev_region` | 清理 |

### 用户态如何交互

- `open("/dev/mydev", O_RDWR)` → 驱动 `open`。
- `read(fd, buf, n)` → 驱动 `read`（与硬件/缓冲交互）。
- `ioctl(fd, CMD, arg)` → 驱动 `ioctl`（控制类操作）。
- **`copy_to_user`/`copy_from_user`**：内核与用户态地址空间隔离，必须在驱动里显式拷贝并做校验。

### 与设备 model / sysfs 关系

- 驱动可能在 `probe` 里创建设备节点、注册 `file_operations`。
- 通过**设备树/匹配**把设备交给驱动（`of_match_table`），`probe` 里做上述注册。
- `/sys` 暴露设备属性，`/dev` 暴露文件接口。

### 常见追问

- 为什么 `read`/`write` 要用 `copy_to_user`？——内核与用户地址空间隔离，直接拷贝用户指针是危险的（指针无效/越界），需专用拷贝并校验。
- 设备节点怎么自动生成？——`device_create` + `udev/mdev` 配合；或手动 `mknod`。
- 主/次设备号作用？——主设备号标识驱动，次设备号区分同驱动的不同实例/子设备。
- 怎么写一个最简单的？——实现 fops + cdev 注册 + device_create。

> 📌 一句话记忆：**字符设备驱动 = 实现 file_operations + 设备号 + cdev + /dev 节点；read/write 用 copy_to_user 与用户态交互。**
