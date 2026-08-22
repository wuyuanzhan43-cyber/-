---
title: 交叉编译
id: cross-compile
category: toolchain
difficulty: 2
tags: [编译, 交叉编译, 工具链]
company: [海康威视, 汇顶]
keywords: 交叉编译 宿主 目标 工具链 prefix 目标架构
answer: |
  **交叉编译**指在**宿主机（开发机，常为 x86）**上编译出能在**目标机（另一架构，如 ARM/MIPS/RISC-V）**上运行的程序。因为目标机可能没有完整开发环境/性能弱。
  做法：用带**目标架构前缀的工具链**，如 `arm-linux-gnueabihf-gcc`、`aarch64-linux-gnu-gcc`、`riscv64-linux-gnu-gcc` 等（`<target>-gcc`），配合对应的**头文件、库（sysroot）**与 `--host`/`--target` 配置。
  关键配置：
  - **`--prefix` 工具链安装路径**、**`--host`/`--target` 架构**（宿主=编译机 build·host，目标=target）。
  - **sysroot**：目标架构的根文件系统（含库/头文件）。
  - **`CROSS_COMPILE`**：内核 `make` 常用，如 `CROSS_COMPILE=arm-linux-gnueabihf-`。
  - 用 **Buildroot / Yocto / cross 工具链** 或 **arm-linux 工具链**（Linaro 等）搭建。
why: |
  因为**目标机（嵌入式 ARM/MIPS/RISC-V）通常无法运行 x86 编译器**（性能、空间、依赖），所以我们主要在**强大、方便的开发机（x86）**上编译，再部署到目标机运行。
  交叉编译的基础是：理解了“**宿主=编译机、目标=运行机**”，配置好 **目标架构 + 工具链 + sysroot**，就能为任意架构产出可运行产物。
---
<FlashCard />

## 深读

### 宿主 vs 目标

| 概念 | 说明 |
|---|---|
| 宿主（build/host） | 运行**编译器**的机器（通常 x86 开发机） |
| 目标（target） | 编译产物**运行**的机器（ARM/MIPS/RISC-V…） |
| 交叉编译 | 宿主≠目标，跨架构编译 |

### 工具链命名约定

- `arm-linux-gnueabihf-gcc`：ARM，hard-float（新版常用）。
- `aarch64-linux-gnu-gcc`：ARM64。
- `riscv64-linux-gnu-gcc`：RISC-V 64。
- 也有 **裸机（bare-metal）** 工具链 `arm-none-eabi-gcc`（无 OS，用于 MCU/Makefile 固件）。

### 常用配置

```bash
# 编译器
CC=arm-linux-gnueabihf-gcc
# 链接器
LD=arm-linux-gnueabihf-ld
# 目标架构参数
CFLAGS += -march=armv7-a -mthumb -mfpu=neon

# 内核/uboot 用 CROSS_COMPILE
make CROSS_COMPILE=arm-linux-gnueabihf- ...
```

- **sysroot**：`--sysroot=/path/to/rootfs`（目标库/头文件）。
- **`--host` / `--target`**：configure 脚本里指定目标架构（如 CMake `-DCMAKE_TOOLCHAIN_FILE`）。

### 常用构建系统

- **Buildroot**：轻量，构建内核+根文件系统+应用。
- **Yocto/OpenEmbedded**：强大、可定制，面向产品级。
- **交叉编译工具链**：Linaro 工具链、`arm-none-eabi`（MCU）。

### 常见坑

1. **库不匹配**：目标机上缺失动态库，或动态链接到了错误的库 → 用静态链接或带上 `.so`、设 `LD_LIBRARY_PATH`。
2. **glibc 版本不匹配**：宿主编译的二进制 glibc 比目标新 → 无法运行。
3. **架构/指令集不对**：`-march`/`-mfloat-abi` 不匹配 → 非法指令。
4. **原样运行到 x86 失败**：目标机架构不匹配，`file` 命令查看 ELF 架构。

### 常见追问

- 交叉编译出来的程序怎么判断能不能在目标机跑？——`file a.out` 看架构（如 ARM）；有 `readelf -h` 看 machine 类型。
- 为什么目标机不开编译器？——目标机资源/性能/依赖受限，开发机高效。
- 裸机（无 OS）和 Linux 工具链有什么区别？——裸机（`arm-none-eabi`）无操作系统，链接脚本+启动文件；Linux 工具链生成能在带内核系统跑的程序，需 sysroot。

> 📌 一句话记忆：**交叉编译=在 x86 开发机上为 ARM/RISC-V 目标机编译：宿主≠目标，用带目标架构前缀的工具链 + sysroot 配置。**
