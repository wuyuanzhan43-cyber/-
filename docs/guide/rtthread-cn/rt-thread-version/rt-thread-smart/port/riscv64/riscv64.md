# RISCV64 移植说明

对于riscv架构移植，其对应的目录结构可以参考`/rt-thread/bsp/qemu-virt64-riscv`

>注: 本文档只叙述 RT-Thread Smart移植相关的说明，在SMART运行之前理应有SPL、SBI等阶段，此处不再过多叙述

## 一、工具链获取

对于RT-Thread Smart来说，需要使用RT-Thread官方提供的工具链来完成

可以在[RT-Thread仓库](https://github.com/RT-Thread/rt-thread/releases)拿到 [riscv64gc-linux-musleabi_for_x86_64-pc-linux-gnu_252938-345d8b6e45.tar.bz2](https://github.com/RT-Thread/rt-thread/releases/download/v5.2.0/riscv64gc-linux-musleabi_for_x86_64-pc-linux-gnu_252938-345d8b6e45.tar.bz2?)工具链。
> 注：此工具链只支持 lp64 ABI

## 二、调整链接脚本

在`/rt-thread/bsp/qemu-virt64-riscv/`中`link_smart.lds`定义了内存布局，需要根据实际情况做出调整，或直接使用当前的设置。
在链接脚本中添加了以下代码：

~~~lds

INCLUDE "link_stacksize.lds"
~~~

此处我们需要设置栈大小，具体方式通过 `scons--menuconfig`进行配置，该配置位于链接脚本同级的文件夹下的`Kconfig`中，在`SConstruct`中将设置好的值写入到`link_stacksize.lds`中，这里建议将其值设置为**16384及以上**

## 三、完善libcpu

### 文件说明

在[QEMU快速上手(xuantie)](/rt-thread-version/rt-thread-smart/quick-start/qemu-xuantie/quickstart.md)中的分析起始可以得知，`libcpu//risc-v/common64`中已经做好了相关内容该目录提供RT-Thread标准版及SMART版本对rv64体系结构支持，其中包括：

|      文件名      |                      文件内容                      |                                                                                     参考标准                                                                                     |
| :---------------: | :------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|   context_gcc.S   |                   线程上下文切换                   |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|   cpuport_gcc.S   |                    线程统一入口                    |                                                                                                                                                                                  |
|     cpuport.c     |                    线程栈初始化                    |                                                                                                                                                                                  |
|     cpuport.h     | 通用寄存器、浮点、向量寄存器个数定义，内存屏障接口 |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|  interrupt_gcc.S  |          异常/中断处理、全局中断使能/关闭          |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|       io.h       |          以字节、字、双字读、写IO地址接口          |                                                                                                                                                                                  |
|    encoding.h    |                   CSR寄存器定义                   |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|   ext_context.h   |             浮点/向量上下文保存与恢复             | RISC-V "V" Standard Extension for Vector Operations, Version 1.0                                                 "F" Extension for Single-Precision    Floating-Point Version 2.2 |
|       mmu.c       |               rv64 sv39 mmu管理接口               |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|       mmu.h       |             rv64 sv39 mmu页表相关定义             |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|      asid.c      |                 rv64 mmu asid支持                 |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|    riscv_mmu.c    |             使能/关闭S态访问用户态页表             |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|       sbi.c       |            通过ecall调用SBI相关信息接口            |                                                           RISC-V Supervisor Binary Interface Specification Version 1.0                                                           |
|       sbi.h       |                SBI spec相关接口定义                |                                                           RISC-V Supervisor Binary Interface Specification Version 1.0                                                           |
|      stack.h      |                   线程栈数据定义                   |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|   stackframe.h   |                线程上下文保存/恢复                |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|    syscall_c.c    |                    系统调用处理                    |                                                                                                                                                                                  |
|      tick.c      |              S态时钟初始化及中断处理              |                                                                                                                                                                                  |
|       tlb.h       |                  tlb刷新/无效接口                  |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |
|      trap.c      |    异常/中断处理，包括中断分发及用户态异常处理    |                                            The RISC-V Instruction Set Manual Volume II: privileged  supervisor-level ISA version 1.12                                            |

#### 移植指南

（1）增加新的CPU支持

创建`libcpu/risc-v/<VENDOR_NAME>/<CPU_NAME>`新目录，同时在`libcpu/risc-v/SConscript`中增加该CPU。

（2）PLIC中断控制器支持

`libcpu/risc-v/virt64/plic.[c|h]`提供了符合《RISC-V Platform-Level Interrupt Controller Specification version 1.0.0 》标准的PLIC中断控制器驱动代码，可作为移植参考。
`libcpu/risc-v/virt64/interrupt.[c|h]`提供了plic的使用，并对接到 rt-thread 系统，可作为参考移植

上述功能在`borad.c`下的`rt_hw_board_init`函数中完成初始化

（3）cache支持

`libcpu/risc-v/virt64/cache.[c|h]`提供了cache相关的功能，可作为参考。因为qemu中无法真实模拟cache行为，所以该文件中并未真正实现cache功能，但是要确保相关接口存在。具体实现硬件cache行为的可参考
`libcpu/risc-v/t-head/c906/cache.[c|h]`

（4）外设支持

外设至少要实现串口驱动在，可参考`bsp/qemu-virt64-riscv/driver/drv_uart.[c|h]`，该串口主要用来实现控制台输出，在`borad.c`下的`rt_hw_board_init`函数中完成初始化。