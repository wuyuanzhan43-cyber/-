# ART-Pi Smart 快速上手
   本文将引导您如何快速上手ART-Pi Smart，从头开始构建RT-Smart实时操作系统，涵盖制作根文件系统、内核编译、应用程序开发、烧录和在开发板中运行的完整流程。

## 1. 系统环境
1. **操作系统**：
   建议使用 Ubuntu20.04 发行版，确保系统能够顺利运行所有相关工具。
   安装基本的开发工具包：
   
   ```bash
   sudo apt update
   sudo apt install build-essential
   ```
2. **依赖工具**：
   安装所需的开发工具，如 Git、Make、QEMU 等：

   ```bash
   sudo apt install git make gcc g++ qemu qemu-system qemu-system-arm tftp vim python3 python3-pip curl libncurses5-dev
   ```


## 2. 制作根文件系统
1. **拉取 [userapps仓库](https://github.com/RT-Thread/userapps)**：
   userapps仓库包含了一些应用程序和配置文件，能够快速生成根文件系统，并为 RT-Thread 操作系统构建所需的应用程序。
   ```bash
   git clone https://github.com/RT-Thread/userapps
   ```

   在 `userapps` 目录中，将有如下文件：

   

   - **apps**：存放应用程序代码，包管理文件夹及编译产物
   - **env.sh**：用于配置环境变量
   - **repo**：用于管理软件包的文件夹
2. **配置环境**：

   ```bash
   source env.sh
   ```
3. **拉取工具链和编译根文件系统**：
   为了编译 ARM 目标平台上的代码，您需要下载并安装 ARM 交叉编译工具链。可以选择使用 arm-linux-musleabi 工具链：

   ```bash
   cd apps
   xmake f -a arm
   xmake
   xmake smart-rootfs
   ```
4. **写入 `inittab` 文件并放入 `rootfs` 目录**：
   inittab 文件是一个用于配置 Linux 系统或类 Unix 系统初始化进程的文件，主要用来设置系统初始化时运行的进程、终端、运行级别等。
   ```bash
   cd userapps/apps/build/rootfs/etc/
   vim inittab
   ```

   添加以下内容：

   ```
   # Mount Filesystem
   ::sysinit:mkdir -p /dev/shm /dev/pts /proc /tmp /run /cmds
   ::sysinit:mount -a

   # Run getty & login
   console::respawn:-/bin/ash

   # using sshd
   ::once:/bin/dropbear -F 2>/root/dropbear.log
   ```
5. **生成fat格式的文件系统**：
   选择FAT文件系统的原因是fat相对其他文件系统更加兼容、简单，特别适用于嵌入式系统和小型存储设备（如本教程中所使用的SD卡）。
   ```bash
   cd userapps/apps
   xmake smart-image -f fat
   ```

   在build目录中生成 `fat.img`文件。
   
   ```
   cd build/
   拷贝fat.img文件到rt-thread/bsp/qemu-vexpress-a9目录中
   ```

## 3. 内核编译
1. **拉取 RT-Thread 操作系统源码包**
   
   执行以下指令来拉取 RT-Thread 源码库：
   
   ```bash
   git clone https://github.com/RT-Thread/rt-thread.git
   ```
   
   执行指令后，将会在当前目录下创建一个rt-thread目录，然后进入 `bsp/qemu-vexpress-a9` 目录：
   
   ```bash
   cd rt-thread/bsp/qemu-vexpress-a9
   ```

2.  **更新在线软件包，更新 pkgs**
      ```bash
      source ~/.env/env.sh
      pkgs --update
      ```

3. **编译内核**

   memuconfig可以通过键盘交互进行配置，它的主要作用是可以在配置选项中快速选择所需的功能，而不需要手动编辑配置文件，配置完之后，menuconfig 会生成一个 .config 文件，用于告诉编译器后续的编译过程。

   ```
   scons --menuconfig
   选中：RT_USING_SMART
   以及：RT_IOREMAP_LATE
   ```

   执行指令：
   ```bash
   scons -j8
   ```

      在当前目录中会生成编译后的 `rtthread.bin` 文件。


4. **在qemu中验证**

   1.**修改 `qemu` 运行脚本：**
   指定qemu模拟 ARM 架构的两核处理器，基于 ARM Cortex-A9 核心的开发板平台。-kernel 选项指定了要启动的内核映像文件及文件系统镜像。
   ```bash
   vim qemu-nographic.sh
   ```

   内容如下：

   ```bash
   qemu-system-arm -M vexpress-a9 -smp cpus=2 -kernel rtthread.bin -nographic -sd fat.img
   ```
   2.**运行脚本：**
   ```bash
   ./qemu-nographic.sh
   ```

   成功进入 `ash`界面，如下图所示：

   

## 4. 编写自己的应用程序
1. **创建新的目录**：
   进入apps目录
   ```bash
   cd userapps/apps
   mkdir welcome
   ```
2. **创建 C 文件和 `xmake.lua`文件：**
   - **编写 `main.c`：**
     
     ```bash
     vim welcome/main.c
      ```
      内容如下：
      ```
     #include <stdio.h>

      int main(int argc, char **argv)
      {
         printf("Welcome to RT-Thread!\n");

         return 0;
      }
     ```

   - **编写 `xmake.lua`：**
   指定项目的构建目标，定义这些目标如何依赖源代码文件、头文件、库等。使xmake 知道如何将源代码文件编译成二进制可执行文件或库文件。
     
     ```bash
     vim welcome/xmake.lua
     ```
     内容如下：

     ```lua
     add_rules("mode.debug", "mode.release")

     target("welcome")
     do
        add_files("*.c")
     end
     target_end()
     ```
3. **重新编译**：因为编写了新的应用程序，所以重新编译uesrapps生成新的文件系统镜像。
   ```bash
   xmake smart-rootfs
   xmake smart-image -f fat
   ```
4. **在 `build` 目录中会重新生成 img 镜像文件**，拷贝到bsp目录。
   ```
   cd build/
   cp fat.img rt-thread/bsp/qemu-vexpress-a9
   ```
5. **进入bsp目录并运行qemu启动脚本**。
   ```bash
   cd rt-thread/bsp/qemu-vexpress-a9
   ./qemu-nographic.sh
   ```
   

   在qemu中启动，成功运行了我们编写的welcome应用程序。

## 5. 烧录映像并在开发板中运行

1. **生成 `fat.img` 文件后，插入 SD 卡**：
   插入sd卡前lsblk，查看当前所有的sdx设备
   ```bash
   lsblk
   ```
   插入后再次lsblk，多出的sd设备就是该sd卡

2. **格式化 SD 卡指定分区为 fat 格式：**

   ```bash
   sudo mkfs.vfat -F 32 /dev/<插入的设备分区>
   ```

3. **烧录 `fat.img` 文件**：

   在userapps/apps/build目录下
   ```bash
   sudo dd if=fat.img of=/dev/<插入的设备分区> bs=4M status=progress
   ```

4. **内核编译**，git下rt-thread文件后进入 `imx6ull-smart` 目录，其他操作同 QEMU 步骤：

   ```bash
   cd rt-thread/bsp/nxp/imx/imx6ull-smart/
   ```

   **配置内核后，修改mnt.c文件**，该文件位置在rt-thread/bsp/nxp/imx/imx6ull-smart/applications/mnt.c

   ```
   vim rt-thread/bsp/nxp/imx/imx6ull-smart/applications/mnt.c
   ```

   ```c
   int part_id = 0;
   if (dfs_mount("emmc0", "/", "elm", 0, (void *)part_id) != 0)
   {
   	if (dfs_mount("sd0", "/", "elm", 0, (void *)part_id) != 0)
   	{
   	rt_kprintf("Dir / mount failed!\n");
   	return -1;
   	}
   	else
   	rt_kprintf("sd0 file system initialization done!\n");
   	}
   	else
   	{
   rt_kprintf("emmc file system initialization done!\n");
   }
   ```

   修改“emmc0"为自己烧录的sd卡分区，sd0对应第一个分区，sd1对应第二个分区，以此类推。

5. **编译后生成 `rtthread.bin` 文件，并使用 TFTP 烧录到开发板**：

   ```bash
   setenv ipaddr 10.23.8.195; setenv serverip 10.23.8.124; tftp 0x80001000 rtthread.bin; dcache flush; go 0x80001000
   ```

   在 uboot 中执行指令，随后成功进入 `ash`界面，如下图所示：

   

   至此，开发板已正常完成烧录和运行。
