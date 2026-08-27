# RT-Thread Smart 用户应用包

## 介绍

RT-Thread Smart 是基于 RT-Thread 操作系统上的混合操作系统，简称为 rt-smart，它把应用从内核中独立出来，形成独立的用户态应用程序，并具备独立的地址空间（32 位系统上是 4G 的独立地址空间）。自 v5.0 合并到 RT-Thread 主干，在内核中打开 RT_USING_SMART 宏即可打开 smart 功能，这部分主要体现的还是内核的部分。但对于一个内核态与用户态分离的操作系统来说，仅仅有内核肯定还不够，还需要在用户应用上能体现更多的功能。

所以基于这个考虑，有了单独的 userapps 仓库：

https://github.com/RT-Thread/userapps

## 抢先预览

考虑到 RT-Thread Smart 的一些特点，目前会以每天定时自动输出对应的 prebuilt 集合包，把相关的功能做一定的集合，形成一份可以在 qemu 模拟 aarch64 的，可以直接仿真运行的集合包。

下面就一起来看看，这份 qemu-virt64-aarch64 集合包里的功能都包括哪些。首先我们先把它给下载下来，下载地址在 userapps 仓库的 README.md 中也提及到：

- aarch64 版本: https://download-redirect.rt-thread.org/download/rt-smart/prebuilt/qemu-virt64-aarch64_latest.tar.gz

这份集合包只包括内核 bin 文件与已经提前打包好了的文件镜像，还不包括 qemu 程序本身，所以还需要下载 qemu（推荐 qemu 7.1.0 版本）。

- Windows: https://qemu.eu/w64/2023/
- Linux: Linux 优先考虑源代码编译，但也提供了一份不带图形输出的精简 deb 文件供安装使用：https://download-redirect.rt-thread.org/download/rt-smart/native/tools/qemu/qemu_7.1.0-2022111713_amd64.deb

注意 RT-Thread 针对 qemu 的移植已经包括对应的 virtio 半虚拟化驱动，但需要相对高版本 qemu 才行，推荐 qemu 7.1.0 版本。打开命令行，执行 run.bat(sh)，如果需要图形输出运行，执行 run_graphic.bat(sh)，一个模拟 aarch64 环境的 RT-Thread Smart 就运行起来了。

在这份 prebuilt 集合包中，主要有以下几方面的应用：

### 系统

#### busybox

BusyBox 是一个在 Linux 系统中集成了一系列常用命令和工具的软件，它被形象地称为 Linux 工具的瑞士军刀。BusyBox 包含了大约三百个最常用的 Linux 命令和工具，从简单的 ls、cat 和 echo 等命令，到更复杂的一些例如 grep、find、wget 等工具，无所不包。同时，BusyBox 还提供了一个简洁而强大的命令行界面，可以通过交互式的方式输入命令并执行。

在 smart 中，大多数基础命令都是由 busybox 提供，这些命令最后都是通过符号链接到 busybox 本体

#### shell

Shell 是一种命令行解释器，它是操作系统内核和用户之间的接口。通常指的是 Unix 和类 Unix 操作系统所使用的命令行解释器。Shell 可以理解并执行用户输入的命令，以及从脚本文件中读取并执行命令。其最主要的功能是提供一个交互式的命令行界面，它允许用户在命令行输入命令，并立即看到命令执行结果。同时，Shell 还支持编写脚本文件，将多个命令组合起来执行，从而实现自动化和批量处理。

在这里需要强调一下，smart 目前存在两个 shell，分别是 msh 与 ash。

- **msh** 是**内核态**的**线程**，它运行在内核态（其实也就是大家所属性的那个宏内核版本的 msh），它运行起来始终会带有一个 msh 的头标，且不支持脚本解析与环境变量等操作
- **ash** 是**用户态**的**进程**，ash 由 busybox 所提供，支持脚本解析与环境变量等操作

现在 smart 运行默认 shell 为 ash，如若想回到 msh，执行 exit 退出 ash 即可。想回到 ash 中的话执行/bin/ash 命令就又能回到 ash 中了

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验脚本功能（需要在 ash 中运行）

```shell
 /tc/resource/hello.sh
```

### 语言

#### micropython

MicroPython 是 Python 3 编程语言的精简高效实现，专门为微型控制器和有限环境设计。它可以在资源受限的环境中运行，并且具有与标准 Python 相似的语法和功能。

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验

```shell
/bin/micropython /tc/resource/hello.py
```

#### lua

Lua 是一种小巧的脚本语言，由巴西里约热内卢天主教大学的一个研究小组于 1993 年开发。它的设计目的是为了灵活嵌入应用程序中，为应用程序提供灵活的扩展和定制功能。Lua 由标准 C 编写而成，几乎在所有操作系统和平台上都可以编译和运行。

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验

```shell
/bin/lua /tc/resource/hello.lua
```

### 图形

#### SDL2

SDL2 是一款开放源代码的跨平台多媒体开发库，使用 C 语言编写。它提供了对音频、键盘、鼠标、操纵杆和图形硬件的低级别访问，被广泛应用于视频播放软件、模拟器和流行游戏开发.

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验(需要 run_graphic.bat(sh)脚本运行以打开图形输出)

```shell
/tc/sdl2_tc -l # 画线
/tc/sdl2_tc -r # 画框
/tc/sdl2_tc --help # 获取更多使用帮助
```

#### ffmpeg

FFmpeg 是一个跨平台的开源多媒体处理工具包，提供了音频、视频和多媒体流的编解码、转换、过滤器等功能。

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验(需要 run_graphic.bat(sh)脚本运行以打开图形输出)

```shell
/tc/player_tc /tc/resource/test.mp4 # 播放视频（无声音）
```

### 网络

#### uhttpd

uHTTPd 是一个轻量级的 HTTP 服务器，它是 OpenWrt 项目的一部分，旨在为嵌入式设备提供简单且高效的 Web 服务器功能。

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验

```shell
/bin/uhttpd -f -p 80 -h /www # 指定端口为80
```

随后，终端就会阻塞在此，由于我们的 qemu 启动脚本参数中参数 `hostfwd=tcp::58080-:80` 将 qemu 内的 80 端口映射到物理机上的 58080 端口。

在电脑浏览器上访问物理机的 58080 端口即可观察到现象

#### sshd & sftpd

sshd(Secure Shell Daemon)和 sftpd(Secure FTP Daemon) 是两个常见的网络服务，用于提供安全的远程访问和文件传输功能。

在 prebuilt 集合包的 smart 环境中，默认用户名为 root，密码也为 root。可以直接执行下述命令体验

```shell
/bin/dropbear -F -p 80 # 指定端口为80
```

随后，终端就会阻塞在此，由于我们的 qemu 启动脚本参数中参数 `hostfwd=tcp::58080-:80` 将 qemu 内的 80 端口映射到物理机上的 58080 端口。

在电脑上使用 sshd / sftpd 工具连接对应物理机的端口即可观察到现象

#### curl

curl 是一个用于发送和接收 HTTP 请求的命令行工具和库。它支持多种协议，包括 HTTP、HTTPS、FTP、SMTP 等，并提供了丰富的功能和选项。

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验

```shell
/bin/curl -v http://www.rt-thread.com/service/rt-thread.txt
```

### AI

#### opencv

OpenCV（Open Source Computer Vision Library）是一个开源的计算机视觉和机器学习库，旨在提供丰富的图像处理和计算机视觉算法以及相关工具。它由一系列用 C++编写的函数和类组成。

OpenCV 为开发者提供了各种各样的功能和工具，涵盖了图像处理、特征检测与提取、目标识别、物体跟踪、摄像机标定、图像分割、三维重建、机器学习等领域。它的使用范围广泛，可以应用于计算机视觉研究、图像处理应用、机器人技术、增强现实、医学图像处理等领域。

在 prebuilt 集合包的 smart 环境中，可以直接执行下述命令体验

```shell
/tc/opencv_tc/1_opencv_core_mat-shape # 测试了十余种 Mat 数据构造方法和 copyTo、reshape 以及 ones 等方法的实现
/tc/opencv_tc/2_opencv_core_split_merge # 测试了 split 和 merge 两个方法，split 将图片通道进行分离，分别处理每个通道后的信息后，再进行通道融合，最后形成处理后的图片。
```

其中 2_opencv_core_split_merge 会在/tmp 目录生成图片可以使用上述 sdl2_tc 来显示图片观察现象

## 开始开发

### 环境准备

> 默认环境为 `ubuntu 20.04`，Windows 下文件镜像制作较为麻烦，留着下次讲
>
> 仅以 aarch64 开发为例

#### 工具链

对于程序开发来说，工具链的获取是最为基础的，smart 的开发需要使用 smart 专用的工具链

```shell
mkdir -p ~/.realthread/.tools/gnu_gcc/
curl -s https://download-redirect.rt-thread.org/download/rt-smart/toolchains/aarch64-linux-musleabi_for_x86_64-pc-linux-gnu_latest.tar.bz2 | tar jxvf - -C ~/.realthread/.tools/gnu_gcc/
export PATH=~/.realthread/.tools/gnu_gcc/aarch64-linux-musleabi_for_x86_64-pc-linux-gnu/bin:$PATH # 一定要记得添加到环境变量
aarch64-linux-musleabi-gcc -v
```

#### hello world 编译

smart 的交叉编译环节与 linux 的交叉编译几乎是一样的，都是 预处理->编译->汇编->链接 的环节

这么说起来可能比较抽象，接下来举个最经典的 hello world 例子证明

**main.c**:

```c
#include <stdio.h>

int main(int argc, char **argv)
{
    printf("hello world!\n");

    return 0;
}
```

随后执行命令直接构建出可执行二进制文件（为了做文件镜像方便和方便演示，这里直接指定静态链接<`-static`>，这样做文件镜像时就不需要弄 libc 与 ld.so 了）

```shell
aarch64-linux-musleabi-gcc ./main.c -o hello -static
file ./hello
```

编译完成使用 file 命令观察结果，我们已经顺利得到了 smart 的 aarch64 架构的可执行二进制文件

#### 镜像制作

> 注意：制作此镜像需要 root 权限

```shell
mkdir fat
dd if=/dev/zero of=fat.img bs=1024 count=65536
mkfs.fat fat.img
sudo mount fat.img fat/
sudo cp -fv ./hello ./fat/hello
sudo umount fat/
file fat.img
```

完成使用 file 命令观察结果，我们已经顺利得到了 fat 文件镜像

#### qemu 运行

> 在上述 fat.img 路径继续操作

将 prebuilt 集合包的内核（rtthread.bin）复制到当前开发目录，新建 run.sh 并将以下内容复制进去

```shell
#!/bin/bash

qemu-system-aarch64 \
    -M virt,gic-version=2 \
    -cpu cortex-a53 \
    -smp 4 \
    -m 128M \
    -kernel rtthread.bin \
    -nographic \
    -drive if=none,file=fat.img,format=raw,id=blk0 \
    -device virtio-blk-device,drive=blk0,bus=virtio-mmio-bus.0 \
    -netdev user,id=net0,hostfwd=tcp::58080-:80 \
    -device virtio-net-device,netdev=net0,bus=virtio-mmio-bus.1 \
    -device virtio-serial-device \
    -chardev socket,host=127.0.0.1,port=43210,server=on,wait=off,telnet=on,id=console0 \
    -device virtserialport,chardev=console0
```

执行命令`chmod a+x run.sh` 确保 run.sh 有可执行权限

执行 run.sh 后即可进入熟悉的 smart 界面了