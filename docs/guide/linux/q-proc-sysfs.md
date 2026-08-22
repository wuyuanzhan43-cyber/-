---
title: proc 与 sysfs 的区别
id: proc-sysfs
category: linux
difficulty: 3
tags: [Linux, 文件系统, 内核接口]
company: [中兴, 汇顶]
keywords: procfs sysfs 内核接口 虚拟文件系统 属性 默认值
answer: |
  **procfs（`/proc`）**：主要暴露**进程/内核动态状态**，是一个**运行时**虚拟文件系统，读写文件即“访问内核”。传统上用于查看进程（`/proc/PID/...`）、系统信息（`/proc/meminfo`、`/proc/cpuinfo`），也可改内核参数。它是**面向“信息/状态”**的、一文件一对象，偏“内核自述”。
  **sysfs（`/sys`）**：把**设备模型**暴露成树（bus/device/driver），带**属性（attribute）**文件，读写属性=读写设备/驱动参数。它更**结构化、与设备/总线/驱动一一对应**，提供 `bind/unbind`、`uevent`、设备属性，便于 udev/mdev 工作。它是**面向“设备与配置”**的、强调层级与属性。
  核心区别：**procfs 面向“进程/系统状态”的动态信息**，**sysfs 面向“设备模型与配置”的结构化属性**。新内核越来越多地把设备/驱动相关属性放到 sysfs，procfs 主要用于进程/内核的查看与参数。
why: |
  两者都是**内存中的虚拟文件系统**，用来“用文件接口访问内核”，但定位不同：procfs 是“内核/进程的状态窗口”，sysfs 是“设备模型的属性字典”。
  这种“文件即接口”让用户态能用 `cat/echo`、`read/write` 与内核交互，非常符合 Linux“一切皆文件”哲学。理解各自定位，才能正确选择暴露哪类信息给用户态。
---
<FlashCard />

## 深读

### 定位对照

| 维度 | procfs（/proc） | sysfs（/sys） |
|---|---|---|
| 面向 | 进程/内核运行状态 | 设备模型（bus/device/driver） |
| 组织 | 一对象一文件，较扁平/按进程 | 层级树，标准目录结构 |
| 核心元素 | PID 目录、meminfo、cpuinfo、参数 | 属性 attribute 文件、uevent、bind/unbind |
| 主要用途 | 查看状态、调内核参数 | 驱动/设备配置、热插拔、udev |
| 典型 | `/proc/meminfo` `/proc/PID/cmdline` | `/sys/bus/.../devices/.../attr` |
| 靠什么驱动 | 进程信息、内核 info | kobject + attribute 属性 |

### 为什么 sysfs 对驱动重要

sysfs 把设备树/总线模型用文件系统呈现，驱动通过 **kobject + attribute** 暴露“可读/可写”属性：

- 用户态 `cat /sys/class/xxx/attr` 读取设备参数。
- `echo 1 > /sys/.../bind` 绑定驱动。
- **udev/mdev** 依赖 sysfs 的 uevent 与属性来动态创建设备节点、挂载分区、加载固件。

它是“驱动与用户态调试/配置”的桥梁，也是 Linux 设备模型的**核心对外窗口**。

### 对比理解（一句话）

- `/proc`：问内核“现在什么情况？”（状态/参数）
- `/sys`：问设备模型“我有哪些设备、属性怎么配？”（设备/配置）

### 常见追问

- 为什么新代码越来越多地用 sysfs？——设备相关属性放 sysfs 更结构化、与设备模型一致，便于统一管理与热插拔；`proc` 逐渐收敛到进程/内核 info。
- 两者会不会混用？——会的，但职责在分化；很多“系统参数”仍留在 proc，而设备参数用 sysfs。
- 用户态怎么访问内核属性？——就是读写这些虚拟文件（`cat/echo`、`open/read/write`），用 `sysfs` 的属性节点。

> 📌 一句话记忆：**procfs = 内核/进程“状态窗口”，sysfs = 设备模型的“属性字典”；都靠“文件即接口”与内核交互。**
