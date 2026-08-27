# QEMU 快速上手 (xuantie)

本教程在 Ubuntu 平台上使用 QEMU 快速上手 RT-Smart，运行 RT-Smart 用户态应用，内核基于 xuantie/virt64/c906 ，其他内核可以用同样的方式运行。

- 模拟器： [Xuantie-qemu-x86_64-Ubuntu-20.04-V5.0.5-B20250108-0335.tar.gz](https://www.xrvm.cn/community/download?id=4397435198627713024)

注：若上述链接中的模拟器不能使用，可以使用下述仓库编译模拟器
> [XUANTIE-RV/qemu](https://github.com/XUANTIE-RV/qemu)

## QEMU (xuantie) 启动流程介绍

相较于实际的硬件平台，QEMU 的 Virt 平台是一个高度抽象的虚拟化平台，旨在提供一个通用的、与具体硬件无关的环境。它不像真实的硬件平台（如特定的 SoC）需要通过 SPL 或 U-Boot 的早期阶段来初始化 DDR（内存）或 eMMC（存储）。在 QEMU Virt 中，内存（RAM）和存储设备（如 VirtIO 块设备）由 QEMU 模拟器直接提供，并已经在模拟器启动时完成初始化。



### OPENSBI 阶段

在 QEMU 环境下，OpenSBI 通常作为 RISC-V 系统引导流程的第一阶段，运行在 M 模式（Machine Mode），负责初始化硬件并为 S 模式（Supervisor Mode，即操作系统或裸机程序运行的模式）提供必要的服务。

在 QEMU 中，OpenSBI 是默认的固件,如果不使用 `-bios`进行指定，默认为`opensbi-riscv64-generic-fw_dynamic.bin`，该文件位于qemu源码的`pc-bios`目录下，定义在`qemu/include/hw/riscv/boot.h`文件中，用于 RISC-V 的引导流程。

> 更过详细内容可查看此文档，这里不再做过多介绍：[OPENSBI介绍](https://www.cnblogs.com/arnoldlu/p/18170952)

#### OPENSBI编译

对于编译OPENSBI，可以通过克隆XUANTIE/opensbi仓库进行编译

~~~shell
git clone git@github.com:XUANTIE-RV/opensbi.git

make PLATFORM=generic PLATFORM_RISCV_XLEN=64 BUILD_INFO=y DEBUG=1  CROSS_COMPILE=/opt/Xuantie-900-gcc-linux-6.6.0-musl64-x86_64-V3.0.2/bin/riscv64-unknown-linux-musl-  O=build_rv64
~~~

在`build_rv64/platform/generic/firmware`路径下便可查看到编译好的固件，使用时需要通过 -bios 指向固件位置  
>工具链可以通过 [Xuantie-900-gcc-linux-6.6.0-musl64-x86_64-V3.0.2-20250410.tar.gz](https://github.com/RT-Thread/toolchains-ci/releases/download/v1.9/Xuantie-900-gcc-linux-6.6.0-musl64-x86_64-V3.0.2.tar.gz)获取

### SMART阶段

SMART默认运行在S模式，起始代码入口位于`rt-thread/libcpu/risc-v/common64/startup_gcc.S`中，SMART就不过介绍，详情可查看[SMART简介](../../introduction/rt-smart-intro/rt-smart-intro.md),这里说一下RT-Thread Smart内核初始化做了哪些内容

1. 早期初始化  
对于riscv架构64位的芯片，RT-Thread SMART的入口代码位于`rt-thread/libcpu/risc-v/common64/startup_gcc.S`目录中，在BSP目录下的链接脚本中可以看到内存的映射,SMART采用高位地址映射策略，将DRAM区域配置于0xFFFFFFC000200000起始处：

   ~~~lds
   MEMORY
   {
      DRAM : ORIGIN = 0xFFFFFFC000200000, LENGTH = 0x1000000 - 0x200000
   }
   ~~~

   但此时QEMU开始运行SMART时`$PC`仍然是低地址。在`rt_hw_mem_setup_early`中开始进行mmu初始化，建立SV39多级页表。具体流程如下：

   

   但此时`$PC`仍然位于低地址，这也是做恒等映射的原因。在页表激活后经过`_after_pc_relocation`将`$PC`指向高地址区域，如下：  

   

2. 系统内部初始化  
   进入到`primary_cpu_entry`会执行以下流程：  

   

   其他流程与系统相关，更多文档可以查阅rt-thread文档中心或官方论坛，这里不再过多说明，与BSP相关的主要`rt_hw_board_init`板级初始化

3. 板级初始化

   `primary_cpu_entry`与`rt_hw_board_init`主要位于`rt-thread/bsp/xuantie/virt64/c906/board/board.c`文件，主要完成如下内容：

   

## 构建内核镜像

### 下载代码

下载 smart 用户态应用代码：

~~~shell
git clone https://github.com/RT-Thread/rt-thread.git
~~~

### 配置工具链

工具链可以通过 [Xuantie-900-gcc-linux-6.6.0-musl64-x86_64-V3.0.2-20250410.tar.gz](https://github.com/RT-Thread/toolchains-ci/releases/download/v1.9/Xuantie-900-gcc-linux-6.6.0-musl64-x86_64-V3.0.2.tar.gz)获取

下载完成之后，解压至/opt，然后打开 `~/.bashrc` 文件，添加环境变量：

~~~shell
export RTT_CC="gcc"
export RTT_EXEC_PATH="/opt/Xuantie-900-gcc-linux-6.6.0-musl64-x86_64-V3.0.2/bin/"
export RTT_CC_PREFIX="riscv64-unknown-linux-musl-"
export PATH="$RTT_EXEC_PATH:$PATH"
~~~

### 配置内核

~~~shell
cd ./rt-thread/bsp/xuantie/virt64/c906/  #打开 rt-thread 项目目录中的 bsp/xuantie/virt64/c906/ 目录
scons --menuconfig
~~~

基于 rt-thread 仓库的  bsp/xuantie/virt64/c906/  构建内核镜像,最终生成 `rtthread.bin/rtthread.elf`，需要注意的是，内核默认支持 fat, 如果要挂载 ext4 的文件系统，则还需要额外安装 lwext4 软件包，即使能 `PKG_USING_LWEXT4`
>具体 menuconfig 路径是 (Top) -> RT-Thread online packages -> system packages ->  lwext4: an excellent choice of ext2/3/4 filesystem for microcontrollers

1. **选择 RT-Thread Kernel 选项**

   

2. **使能 Smart 内核**

   

3. **使能 lwext4 软件包(不使用ext4文件系统可不选)**

   

4. **执行 scons 编译**

   

## 制作根文件系统

1. **拉取 [userapps仓库](https://github.com/RT-Thread/userapps)**：
   userapps仓库包含了一些应用程序和配置文件，能够快速生成根文件系统，并为 RT-Thread 操作系统构建所需的应用程序。

   ~~~shell
   git clone https://github.com/RT-Thread/userapps
   ~~~

   在 `userapps` 目录中，将有如下文件：

   

   - **apps**：存放应用程序代码，包管理文件夹及编译产物
   - **env.sh**：用于配置环境变量
   - **repo**：用于管理软件包的文件夹
2. **配置环境**：

   ~~~shell
   source env.sh
   ~~~

3. **拉取工具链和编译根文件系统**：
   为了编译 xuantie 目标平台上的代码，您需要下载并安装交叉编译工具链：

   ~~~shell
   cd apps
   xmake f -a xuantie
   xmake
   xmake smart-rootfs
   ~~~

4. **生成文件系统镜像**：
   生成的文件系统要与kernel互相匹配，如果在上述配置内核时没有使用ext4的文件系统，那么使用如下命令生成fat格式的文件系统，在build目录中生成 `fat.img`文件。

   ~~~shell
   xmake smart-image -f fat
   ~~~

   如果kernel使用ext4的文件系统，那么使用如下命令生成ext4格式的文件系统，在build目录中生成 `ext4.img`文件。

   ~~~shell
   xmake smart-image
   ~~~

## 编写自己的应用程序

1. **创建新的目录**：
   进入apps目录

   ~~~bash
   cd userapps/apps
   mkdir welcome
   ~~~

2. **创建 C 文件和 `xmake.lua`文件：**

   - **编写 `main.c`：**

      ~~~bash
      vim welcome/main.c
      ~~~

      内容如下：

      ~~~c
      #include <stdio.h>

      int main(int argc, char **argv)
      {
         printf("Welcome to RT-Thread!\n");

         return 0;
      }
      ~~~

   - **编写 `xmake.lua`：**

      指定项目的构建目标，定义这些目标如何依赖源代码文件、头文件、库等。使xmake 知道如何将源代码文件编译成二进制可执行文件或库文件。

        ~~~bash
        vim welcome/xmake.lua
        ~~~

        内容如下：

        ~~~lua
        add_rules("mode.debug", "mode.release")

        target("welcome")
        do
           add_files("*.c")
        end
        target_end()
        ~~~

3. **将创建的文件夹添加至build目录**：因为有些应用kernel还未支持，如sdl库需要图形显示等等。在`userapps/apps/xmake.lua`中的run_apps中添加文件夹路径

   ~~~shell
       local run_apps = {
        "busybox",
        "cpp",
        "hello",
        "shm_ping",
        "shm_pong",
        "smart-fetch",
        "zlib",
        "welcome",
    }
   ~~~

4. **重新编译**：因为编写了新的应用程序，所以重新编译uesrapps生成新的文件系统镜像。

   ~~~bash
   xmake
   xmake smart-rootfs
   xmake smart-image / xmake smart-image -f fat (根据kernel支持的文件格式选择不同的指令)
   ~~~

### 运行 RT-Thread Smart 版

qemu下的smart运行需要三个文件，分别为`rtthread.bin`、`ext4.img/fat.img`、`run.sh`、，即内核文件，用户程序镜像，启动脚本。其中，`run.sh`位于bsp`rt-thread/bsp/xuantie/virt64/c906`目录，`rtthread.bin`编译完内核后与`run.sh`位于同一目录，`ext4.img/fat.img`在生成镜像后位于`userapps/apps/build/`目录。

将这三个文件放到同一个文件夹下，即可运行smart。示例如下：

~~~shell
$ bash run.sh ext4.img

OpenSBI v1.4
   ____                    _____ ____ _____
  / __ \                  / ____|  _ \_   _|
 | |  | |_ __   ___ _ __ | (___ | |_) || |
 | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
 | |__| | |_) |  __/ | | |____) | |_) || |_
  \____/| .__/ \___|_| |_|_____/|____/_____|
        | |
        |_|

Platform Name             : riscv-virtio,qemu
Platform Features         : medeleg
Platform HART Count       : 1
Platform IPI Device       : aclint-mswi
Platform Timer Device     : aclint-mtimer @ 10000000Hz
Platform Console Device   : uart8250
Platform HSM Device       : ---
Platform PMU Device       : ---
Platform Reboot Device    : syscon-reboot
Platform Shutdown Device  : syscon-poweroff
Platform Suspend Device   : ---
Platform CPPC Device      : ---
Firmware Base             : 0x80000000
Firmware Size             : 323 KB
Firmware RW Offset        : 0x40000
Firmware RW Size          : 67 KB
Firmware Heap Offset      : 0x48000
Firmware Heap Size        : 35 KB (total), 2 KB (reserved), 9 KB (used), 23 KB (free)
Firmware Scratch Size     : 4096 B (total), 328 B (used), 3768 B (free)
Runtime SBI Version       : 2.0

Domain0 Name              : root
Domain0 Boot HART         : 0
Domain0 HARTs             : 0*
Domain0 Region00          : 0x0000000000100000-0x0000000000100fff M: (I,R,W) S/U: (R,W)
Domain0 Region01          : 0x0000000010000000-0x0000000010000fff M: (I,R,W) S/U: (R,W)
Domain0 Region02          : 0x0000000002000000-0x000000000200ffff M: (I,R,W) S/U: ()
Domain0 Region03          : 0x0000000080040000-0x000000008005ffff M: (R,W) S/U: ()
Domain0 Region04          : 0x0000000080000000-0x000000008003ffff M: (R,X) S/U: ()
Domain0 Region05          : 0x000000000c400000-0x000000000c5fffff M: (I,R,W) S/U: (R,W)
Domain0 Region06          : 0x000000000c000000-0x000000000c3fffff M: (I,R,W) S/U: (R,W)
Domain0 Region07          : 0x0000000000000000-0xffffffffffffffff M: () S/U: (R,W,X)
Domain0 Next Address      : 0x0000000080200000
Domain0 Next Arg1         : 0x000000008fe00000
Domain0 Next Mode         : S-mode
Domain0 SysReset          : yes
Domain0 SysSuspend        : yes

Boot HART ID              : 0
Boot HART Domain          : root
Boot HART Priv Version    : v1.10
Boot HART Base ISA        : rv64imafdc
Boot HART ISA Extensions  : zicntr,zihpm
Boot HART PMP Count       : 16
Boot HART PMP Granularity : 2 bits
Boot HART PMP Address Bits: 54
Boot HART MHPM Info       : 16 (0x0007fff8)
Boot HART MIDELEG         : 0x0000000000000222
Boot HART MEDELEG         : 0x000000000000b109
heap: [0x003404c0 - 0x043404c0]

 \ | /
- RT -     Thread Smart Operating System
 / | \     5.2.1 build Jun 13 2025 09:43:35
 2006 - 2024 Copyright by RT-Thread team
[I/utest] utest is initialize success.
[I/utest] total utest testcase num: (1)
[I/drivers.serial] Using /dev/ttyS0 as default console
[W/DFS.fs] mount / failed with file system type: elm
file system initialization done!
Hello RISC-V
msh />/ # 
/ # 
/ # ls
bin         lib         proc        sbin        usr
dev         lost+found  root        services    var
etc         mnt         run         tmp
/ #
~~~

## Features

- vdso完整支持
- 更多的qemu外设支持，如：网络等
- 更多的userapps应用支持

### 联系人信息

如有意向咨询请联系：<business@rt-thread.com>