# 设备树

设备树（Device Tree）是一种用于描述嵌入式系统硬件配置的数据结构，它为不同的硬件平台和操作系统提供了一种通用的方式来配置和管理硬件资源。设备树将硬件描述与操作系统内核分离，使得相同的内核可以在不同的硬件平台上运行，从而提高了嵌入式系统的可移植性。设备树多用于基于 ARM 的系统，但在其他各种架构中也有应用。

## 为 rt-thread 指定设备树文件

在使用设备树运行 rt-thread 前需要将设备树源文件编译为二进制文件，使用如下命令即可编译：

```
dtc -I dts -O dtb -o mydtb.dtb mydts.dts
```

### 使用 qemu

在 qemu 环境下，可以使用 `-dtb mydtb.dtb` 来指定使用的 dtb 文件，也可以不指定，使用默认的 dtb 文件。aarch64 下，内核启动时可从 x0 寄存器读到设备树文件地址。

### 使用 uboot

uboot 的 bootcmd 环境变量添加加载设备树命令，并设置环境变量 fdtaddr，例如（具体需要根据设备情况而定）：

```
// bootcmd 中加入加载设备树的命令，这里以从 mmc 加载为例，${fdt_addr} 替换为加载到内存的地址
setenv bootcmd "load mmc 0:1 ${fdt_addr} mydtb.dtb; [other cmd]"
setenv fdtaddr ${fdt_addr}
```

aarch64 下，内核启动时可从 x0 寄存器读到设备树文件地址。

## rt-thread 设备树使用场景

### 系统初始化

该部分需要根据设备树系统结点信息进行设备的初始化，包含如下方面：

- 解析设备树根节点，获得系统信息；
- 内存初始化，对设备树指定的预留内存、内核、fdt 等区域保留，其它部分内存加入伙伴系统管理；
- 对启动参数 bootargs 进行处理，包括挂载根文件系统，设置早期控制台等；
- 初始化 directfs，从而可以在正常运行时获得设备信息；
- 解压缩设备树，方便之后对设备树的访问；
- 根据 /cpus 结点信息对 cpu 进行初始化；
- 根据中断控制器结点进行中断初始化；
- 在设备初始化完毕后设置正常运行下的控制台；

### 设备初始化

设备树环境下设备初始化依赖于平台 (platform) 总线设备驱动 (bus-device-driver)。下面是其架构图：



- rt_device: 提供 app 调用的接口；
- rt_driver: 提供操作底层硬件的能力；
- rt_bus: 为虚拟的总线，挂载了多个 device 和 driver, device 和 driver 可以通过 bus 进行匹配和其他操作；
- platform_bus: 是 rt_bus 的一个单例，设备树中的设备和驱动设备树的驱动程序挂载在 platform_bus 上；
- rt_platform_device：继承自 rt_device，设备树上的设备经解析后得到，挂载在 platform_bus 上；
- rt_platform_driver: 继承自 rt_driver，是挂载在 platform_bus 上的驱动；
- rt_ofw_node：是设备树经过解压缩后得到的设备结点信息，每个 rt_platform_device 均对应一个 rt_ofw_node；
- rt_ofw_node_id：是 rt_platform_driver 用于与 rt_platform_device 进行匹配的信息；

设备初始化是在 rt_thread 的组件初始化 rt_components_board_init 时期，主要包含如下方面：

- 注册平台总线 platform_bus；
- 将代码中的平台驱动 rt_platform_driver 挂载在平台总线上；
- 给设备树解析得到的各设备分配一个平台设备 rt_platform_device，并将其挂载在平台总线上；
- 当平台驱动和平台设备相符（兼容属性或者名称相同）时，两者相匹配，并调用驱动的 probe 函数进行初始化；

## rt-thread 中设备树编写

在 rt-thread 中使用设备树，首先需要为平台编写设备树文件。

### 设备树系统结点编写

设备树的系统结点用于 rt-thread 的系统初始化过程以及提供对设备结点解析所需的部分参数。

#### 根节点

根节点说明整个设备的情况，对应属性编写如下：

| 属性 | 解释 |
| --- | --- |
| #size-cells | 子结点使用多少个 32 位整数来表示大小属性，rt-thread 中如未指定使用默认值 1 |
| #address-cells | 子结点使用多少个 32 位整数表示地址属性，rt-thread 中如未指定使用默认值 1 |
| compatible | 指定平台名称，格式为 "<厂商>,<型号>"，用于选择正确平台特定程序来初始化设备或判断设备是否有某些特性 |
| model | 设备型号，该属性仅用于为用户提供设备描述，不用于设备匹配 |

#### /aliases 结点

该节点可以为其它结点指定别名，以简化书写。其属性名为结点别名，值为对应的结点全称。

#### 内存结点

内存结点指定系统的可用内存，对应属性编写如下：

| 属性 | 解释 |
| --- | --- |
| device_type | 属性值必须为 "memory" |
| reg | 指定内存范围，格式为 <地址 大小>，地址和大小的表示需满足根节点指定的 #address-cells 和 #size-cells |
| initial-mapped-area | 指定初始化映射区域，目前 rt-thread 不支持该属性 |
| hotpluggable | 指定该内存区域可以热插拔，目前 rt-thread 不支持该属性 |

注意事项：

- 该类型结点必须位于根节点 / 之下；
- 该类型结点必须指定属性名 device_type 的值为 "memory"；
- 该类型结点必须使用 reg 属性指定内存范围；
- 该类型结点命名方式一般为 memory@start-address；

#### /reserved-memory

该结点下的子结点用来保存系统的一系列预留内存区域，其内存区域均不会加入伙伴系统。属性编写如下：

| 属性 | 解释 |
| --- | --- |
| #size-cells | 必须指定为根节点的 #size-cells |
| #address-cells | 必须指定为根节点的 #address-cells |
| ranges | 指定 reserved-memory 结点下地址空间如何向 cpu 物理地址空间转换 |

- 以上三个属性均必须明确指定；

##### /reserved-memory 的子结点

目前仅支持以下属性

| 属性 | 解释 |
| --- | --- |
| reg | 预留内存区域在 reserved-memory 地址空间下地址范围 |

普通设备结点可以使用 memory-region 来指定其使用的预留内存区域，值为对 /reserved-memory 的子结点的引用，但需要对应驱动程序的支持。

#### /chosen 结点

该节点描述了系统固件所指定的初始化参数，对应属性编写如下：

| 属性 | 解释 |
| --- | --- |
| bootargs | 一串指定启动参数的字符串 |
| stdout-path | 系统正常运行时标准输出重定向到的设备，支持两种格式 serialN:bbbbpnf 和 /serial-path |
| linux,initrd-start | 一个整数值，表示 initrd 在内存中的起始地址 |
| linux,initrd-end | 一个整数值，表示 initrd 在内存中的结束地址 |

rt-thread 中 bootargs 支持的参数如下：

| 参数 | 值 |
| --- | --- |
| earlycon | 指定系统初始化阶段的控制台输出方式 |
| console | 指定系统正常运行时控制台 |
| root | 指定挂载根文件系统的设备 |
| rootfstype | 指定根文件系统的类型 |
| rootwait | 是否等待根文件系统设备初始化 |

/chosen 中 bootargs 属性的 console 参数和 stdout-path 属性均可以指定系统输出设备，优先级 console 参数大于 stdout-path 属性。

#### /cpus 结点

该结点包含系统的所有 cpu，对应属性编写如下：

| 属性 | 解释 |
| --- | --- |
| #address-cells | cpu 子结点使用多少个 32 位整数来表示大小属性 |
| #size-cells | 该值必须为 0，cpu 的 reg 没有 size 属性 |

##### /cpus/cpu* 结点

该结点描述一个具体的 cpu 实例，对应属性编写如下：

| 属性 | 解释 |
| --- | --- |
| device_type | 必须指定为 "cpu" |
| reg | 这里表示 cpu 的硬件编号，用一个 32 位无符号整型数表示 |
| enable-method | 指定禁用状态 cpu 的启动方法，rt-thread 支持 "psci" 和 "spin-table" 两种方式 |
| cpu-release-addr | 如果 enable-method 属性指定为 "spin-table"，则需要该属性，其值指定了一个 spin-table 条目的物理地址，用于解除辅助 CPU 的阻塞状态，以便其可以继续执行任务 |

### rt-thread 中设备结点编写

对于设备结点的编写，这里介绍如何编写设备结点：

#### compatible 属性

该属性用于设备和驱动的绑定。以下是编写该属性注意事项：

- 设备结点必须拥有该属性，否则该设备无效；
- 如果含有下表属性值之一，则忽略该结点，转而处理子节点；

| 属性值 | 含义 |
| --- | --- |
| "simple-bus" | 用于表示基本的硬件总线节点，描述设备之间的连接和资源分配 |
| "simple-mfd" | 用于描述多功能设备（Multifunction Device，MFD），包括多个子设备 |
| "isa" | 表示 ISA 总线，是一种古老的总线标准，通常不太常见，用于连接一些旧的外部设备 |
| "arm,amba-bus" | 用于表示 AMBA 总线，是 ARM 架构中常见的总线标准，用于连接各种外部设备和内核总线 |

- 如果 compatible 不为空且不为上表之一，则注册为平台设备，不再处理子结点；
- 注册为平台设备后，如果和某平台驱动相匹配，则调用其 probe 函数，其子节点也交由对应的驱动处理；

#### 中断相关属性

中断控制器属性：

| 属性 | 解释 |
| --- | --- |
| #interrupt-cells | 用于指定中断控制器在设备树中的中断表示方式 |
| interrupt-controller | 如果某设备结点包含该属性，则该设备是中断控制器 |

设备的中断相关属性：

| 属性 | 解释 |
| --- | --- |
| interrupt-parent | 该设备向哪个中断控制器发送中断，值为 phandle 或中断控制器路径 |
| interrupts | 为设备描述中断信息，一个中断所使用的单元格用 #interrupt-cells 属性描述 |
| interrupts-extended | 为设备描述中断信息，该设备会向不同中断控制器发送中断 |
| interrupt-map | 用于描述多个设备之间的中断映射关系 |
| interrupt-mask | 用于对中断号进行过滤、匹配、多路复用 |
| interrupt-affinity | 设置中断向哪个 cpu 发送，值为 cpu 对应的设备树结点，该属性非设备树标准属性 |
| interrupt-names | 指定中断名称，是数个字符串，每个字符串对应一个中断资源，该属性非设备树标准属性 |

相应驱动程序需要提供解析这些属性的支持。

#### IO 相关属性

| 属性 | 解释 |
| --- | --- |
| reg | 描述该硬件所使用的物理地址资源，驱动程序需要对该区域调用 ioremap |
| reg-names | 指定区域名称，是数个字符串，每个字符串对应一个 IO 资源，该属性非设备树标准属性 |
| ranges | 通常用于总线类型设备，描述总线结点和父节点的地址空间如何映射 |
| memory-region | 所使用的预留内存区域，目前暂无 API 处理该属性 |

### 示例

```dts
/ {
    // 表示子结点的地址相关值占一个 32 位整数的 cell
    #address-cells = <1>;
    // 表示子结点的大小相关值占一个 32 位整数的 cell
    #size-cells = <1>;
    // 表示设备兼容 "my-hardware" 的特性
    compatible = "my-hardware";
    // 设备模型，仅用于为用户提供设备信息
    model = "My Hardware Platform";

    // 使用 ttyS0 作为控制台输入输出设备，波特率 115200，并将 "/dev/mmcblk0p2" 块设备上的 VFAT 文件系统挂载到根目录。
    chosen {
        bootargs = "console=ttyS0,115200 root=/dev/mmcblk0p2 rw rootfstype=vfat";
    };

    // 指定可用物理内存范围
    memory@0x0 {
        // 必须显式指定该属性值为 "memory"
        device_type = "memory";
        reg = <0x0 0x10000000>; // 1GB of RAM starting at address 0x0
    };

    cpus {
        // cpus 的该属性必须是 0x0
        #size-cells = <0x0>;
        #address-cells = <0x1>;

        cpu@0 {
            reg = <0x0>;
            enable-method = "psci";
            compatible = "arm,cortex-a53";
            // cpu 节点必须指定 device_type 为 "cpu"
            device_type = "cpu";
        };

        cpu@1 {
            reg = <0x1>;
            enable-method = "psci";
            compatible = "arm,cortex-a53";
            device_type = "cpu";
        };
    };

    reserved-memory {
        // 指定地址单元格的数量
        #address-cells = <1>;
        // 指定大小单元格的数量
        #size-cells = <1>;
        // 表示将 reserved-memory 结点下以 0x0 开始的地址长度 0x100 映射到 cpu 的 0x10000 地址
        ranges = <0x0 0x10000 0x100>;

        // 内存区域的名称
        framebuffer@30000000 {
            compatible = "my_reserved_memory";
            // 内存区域的地址和大小。根据父结点的 ranges，其映射到 cpu 地址空间的 0x10000
            reg = <0x0 0x100>;
        };
    };

    // 指定上面的内存结点别名为 mem
    aliases {
        mem = &/memory@0x0;
    };

    // 其他结点如果想引用内存结点，可以不必提供完整路径
    other-region {
        memory-device = <&mem>
    }

    intc@8000000 {
        // 中断控制器使用的内存
        reg = <0x0 0x8000000 0x0 0x10000 0x0 0x8010000 0x0 0x10000>;
        compatible = "arm,cortex-a15-gic";
        interrupt-controller;
        #interrupt-cells = <0x3>;
    };

    // 一个设备示例
    my-device {
        // 用于与驱动配对
		compatible = "my-device";
        // IO 资源
		reg = <0x0 0x1000>;
        // 向该中断控制器发送中断请求
		interrupt-parent = <&/intc@8000000>;
        // 中断资源，格式由对应中断控制器的 #interrupt-cells 控制
		interrupts = <0x0 0x1 0x2>;
	};
};
```

## rt-thread 下驱动程序编写

为了使 rt-thread 能够使用设备树指定的设备，需要编写能够驱动设备的驱动程序。

### 驱动兼容性

设备需要指定其可以与何种设备相匹配。以 pl061 驱动为例，指定方法如下：

```c
// 定义 rt_ofw_node_id 结构体，其中指定了可以兼容的设备应有的 compatible 属性
static const struct rt_ofw_node_id pl061_ofw_ids[] =
{
    {.compatible = "arm,pl061"},
    {/* sentinel */}
};

static struct rt_platform_driver pl061_driver =
{
    // 驱动名称，假如设备名是 "pin-pl061" 也可以匹配
    .name = "pin-pl061",
    // 指定了该驱动的 ids，可判断其可以与何种设备相匹配
    .ids = pl061_ofw_ids,

    // probe 函数，在驱动探测到相匹配的设备时对其调用的函数，代码见下方 probe 函数编写介绍
    .probe = pl061_probe,
};
// 在系统启动时注册该平台驱动
RT_PLATFORM_DRIVER_EXPORT(pl061_driver);
```

- 如上所示，pl061_driver 可以与设备名为 "pin-pl061" 或 compatible 属性含有 "arm,pl061" 的设备相匹配；

### probe 函数编写

probe 函数是 driver 探测到相匹配的设备时对其调用的函数。具体需要做如下工作：

- 需要获取设备所需的中断及 IO 资源；
- 对设备 IO 资源，需要映射至系统的虚拟地址空间，对 IO 资源，需要配置中断控制器及设置中断服务例程；
- 需要对设备其它属性进行处理，如设备的配置信息；
- 需要向系统注册该设备，使之可以使用；

对中断及 IO 资源处理可以使用的 API 如下：

#### 中断资源处理

如果设备驱动程序需要对设备的中断资源进行处理，需要包含头文件：

```c
#include <drivers/ofw_irq.h>
```

以下是中断资源处理接口介绍：

```c
int rt_ofw_irq_cells(struct rt_ofw_node *np)
```

该函数获取设备结点 #interrupt-cells 属性

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| int | 设备结点对应的 #interrupt-cells 属性值 |
| -RT_EEMPTY | 设备结点没有该属性 |
| -RT_EINVAL | 设备不合法 |

```c
rt_err_t rt_ofw_parse_irq_map(struct rt_ofw_node *np, struct rt_ofw_cell_args *irq_args)
```

该函数处理设备结点 interrupt-map 属性

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| irq_args | 传递参数及存放解析 interrupt-map 属性结果 |
| ** 返回 ** | ** 描述 ** |
| 0 | 解析成功 |
| 错误码 | 解析失败 |

```c
rt_err_t rt_ofw_parse_irq_cells(struct rt_ofw_node *np, int index, struct rt_ofw_cell_args *out_irq_args)
```

该函数解析设备中断资源，其首先检查参数 interrupts-extended，如果没有该参数则检查 interrupts 参数。可以获取中断号及对应中断控制器信息。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| index | 设备第几个中断资源 |
| out_irq_args | 存储获得的中断信息 |
| ** 返回 ** | ** 描述 ** |
| 0 | 获取中断信息成功 |
| 错误码 | 获取失败 |

```c
struct rt_ofw_node *rt_ofw_find_irq_parent(struct rt_ofw_node *np, int *out_interrupt_cells)
```

该函数获取设备对应中断控制器的结点信息。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| out_interrupt_cells | 中断控制器的 #interrupt-cells 属性 |
| ** 返回 ** | ** 描述 ** |
| rt_ofw_node 结点 | 获取的中断控制器结点 |
| RT_NULL | 找不到对应的中断控制器结点 |

```c
int rt_ofw_map_irq(struct rt_ofw_cell_args *irq_args)
```

该函数将设备的中断信息应用于中断控制器中。一般在使用 rt_ofw_parse_irq_map 或 rt_ofw_parse_irq_cells 获取到设备中断信息后，调用该函数使能对应中断。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| irq_args | 获取到的设备中断信息 |
| ** 返回 ** | ** 描述 ** |
| 大于 0 整数 | 设置的中断编号 |
| 错误码 | 执行错误 |

```c
int rt_ofw_get_irq_count(struct rt_ofw_node *np)
```

该函数返回设备指定的中断资源数目。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| 一个非负整数 | 设备中断资源数目 |
| -RT_EINVAL | 传入的 np 不合法 |

```c
int rt_ofw_get_irq(struct rt_ofw_node *np, int index)
```

该函数获取设备树结点的指定中断资源中断号并进行处理。具体地，该函数将调用 ofw_map_irq 使能中断，并根据设备的 interrupt-affinity 属性设置应当响应中断的 cpu，最后返回设置的中断号。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| index | 需要处理的设备中断资源编号 |
| ** 返回 ** | ** 描述 ** |
| 一个非负整数 | 指定中断资源的中断号 |
| 错误码 | 执行错误 |

```c
int rt_ofw_get_irq_by_name(struct rt_ofw_node *np, const char *name)
```

该函数作用与 rt_ofw_get_irq 相同，不过使用名称来指定中断。该函数会通过 name 参数，根据设备的 interrupt-names 属性来获得对应的中断资源编号，最后调用 rt_ofw_get_irq。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| name | 需要处理的设备中断名称 |
| ** 返回 ** | ** 描述 ** |
| 一个非负整数 | 指定中断资源的中断号 |
| 错误码 | 执行错误 |

```c
rt_isr_handler_t rt_hw_interrupt_install(int vector, rt_isr_handler_t handler, void *param, const char *name)
```

该函数设置中断向量表，用于指定某中断号对应的中断服务例程。需要包含头文件 `<rthw.h>`

| 参数 | 描述 |
|:------------------|:------------------------------------|
| vector | 需要设置的中断号，可以由 rt_ofw_get_irq 或 rt_ofw_get_irq_by_name 获得 |
| handler | 需要设置成的中断服务例程 |
| param | 中断服务例程参数 |
| name | 中断服务例程名称 |
| ** 返回 ** | ** 描述 ** |
| RT_NULL | 该中断号原来无中断服务例程 |
| old_handler | 之前该中断号对应的中断服务例程 |

#### IO 资源处理

如果设备驱动程序需要对设备的 IO 资源进行处理，需要包含头文件：

```c
#include <drivers/ofw_io.h>
```

以下是 IO 资源处理接口介绍

```c
int rt_ofw_bus_addr_cells(struct rt_ofw_node *np)
```

获取总线设备的 #address-cells 属性。它会从总线设备结点遍历 parent 结点，获取到第一个 #address-cells 则返回。如果未获得则使用默认值 1。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| 一个正整数 | 设备的 #address-cells 属性 |
| -RT_EINVAL | np 不合法 |

```c
int rt_ofw_bus_size_cells(struct rt_ofw_node *np)
```

获取总线设备的 #size-cells 属性。它会从总线设备结点遍历 parent 结点，获取到第一个 #size-cells 则返回。如果未获得则使用默认值 1。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| 一个正整数 | 设备的 #size-cells 属性 |
| -RT_EINVAL | np 不合法 |

```c
int rt_ofw_io_addr_cells(struct rt_ofw_node *np)
```

获取普通设备的 #address-cells 属性。其优先获取所在总线（即其父节点）的该属性。如果未获得则使用默认值 1。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| 一个正整数 | 设备的 #address-cells 属性 |
| -RT_EINVAL | np 不合法 |

```c
int rt_ofw_io_size_cells(struct rt_ofw_node *np)
```

获取普通设备的 #size-cells 属性。其优先获取所在总线（即其父节点）的该属性。如果未获得则使用默认值 1。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| 一个正整数 | 设备的 #size-cells 属性 |
| -RT_EINVAL | np 不合法 |

```c
int rt_ofw_get_address_count(struct rt_ofw_node *np)
```

该函数获取设备结点的 reg 属性中地址的数量。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| ** 返回 ** | ** 描述 ** |
| 一个非负整数 | 设备结点的 reg 属性中地址的数量 |
| -RT_EINVAL | np 不合法 |

```c
rt_err_t rt_ofw_get_address(struct rt_ofw_node *np, int index, rt_uint64_t *out_address, rt_uint64_t *out_size)
```

该函数获取设备结点的 reg 属性中指定编号的以 address-size 对表示的 IO 资源。获得的地址是转换到 cpu 地址空间的地址。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| index | 需要获得的 address-size 对的编号 |
| out_address | 存储获得的 address 转换到 cpu 地址空间的值 |
| out_size | 存储获得的 size 值 |
| ** 返回 ** | ** 描述 ** |
| RT_EOK | 执行成功 |
| -RT_EINVAL | 参数不合法 |

```c
rt_err_t rt_ofw_get_address_by_name(struct rt_ofw_node *np, const char *name, rt_uint64_t *out_address, rt_uint64_t *out_size)
```

该函数作用与 rt_ofw_get_address 相同，不过使用名称来指定 address-size 对表示的 IO 资源。该函数会通过 name 参数，根据设备的 reg-names 属性来获得对应的 IO 资源编号，之后过程与 rt_ofw_get_address 相同。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| name | 需要获得的 IO 资源名称 |
| out_address | 存储获得的 address 转换到 cpu 地址空间的值 |
| out_size | 存储获得的 size 值 |
| ** 返回 ** | ** 描述 ** |
| RT_EOK | 执行成功 |
| -RT_EINVAL | 参数不合法 |

```c
int rt_ofw_get_address_array(struct rt_ofw_node *np, int nr, rt_uint64_t *out_regs)
```

该函数获取设备结点前 nr 个 IO 资源属性。地址值会转换到 cpu 物理地址空间。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| nr | 需要获得的 IO 资源个数 |
| out_regs | 存储获得的以 address-size 对表示的 IO 资源 |
| ** 返回 ** | ** 描述 ** |
| 一个非负整数 | 实际获得的 IO 资源个数 |
| -RT_EINVAL | 参数不合法 |

```c
rt_uint64_t rt_ofw_translate_address(struct rt_ofw_node *np, const char *range_type, rt_uint64_t address)
```

将某一地址从设备所属总线的地址空间转换到 cpu 的物理地址空间。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| range_type | 映射类型，不指定时默认为 "ranges"，该函数从该属性来获得映射方式 |
| address | 设备所属总线下的某一地址 |
| ** 返回 ** | ** 描述 ** |
| 最大 64 位正整数 | 转换失败 |
| 一个合法物理地址 | 设备映射到的物理地址 |

```c
void *rt_ofw_iomap(struct rt_ofw_node *np, int index)
```

将设备的一个 IO 资源重映射到系统内核地址空间的虚拟地址。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| index | 指定的 IO 资源编号 |
| ** 返回 ** | ** 描述 ** |
| RT_NULL | 执行失败 |
| 一个合法的内核虚拟地址 | 设备映射到的内核虚拟地址 |

```c
void *rt_ofw_iomap_by_name(struct rt_ofw_node *np, const char *name)
```

与 rt_ofw_iomap 作用相同，但使用名称来指定设备 IO 资源。该函数会通过 name 参数，根据设备的 reg-names 属性来获得对应的 IO 资源编号，之后过程与 rt_ofw_iomap 相同。

| 参数 | 描述 |
|:------------------|:------------------------------------|
| np | 设备结点 |
| name | 指定的 IO 资源名称 |
| ** 返回 ** | ** 描述 ** |
| RT_NULL | 执行失败 |
| 一个合法的内核虚拟地址 | 设备映射到的内核虚拟地址 |

#### 其它属性处理

在 `components/drivers/include/drivers/ofw.h` 中定义了一系列可以处理不同属性值格式的函数，驱动程序可以调用这些函数来获得并处理这些属性。

#### probe 函数示例

下面仍以 pl061 设备为例，介绍 probe 函数的编写。

```c
static rt_err_t pl061_ofw_init(struct rt_platform_device *pdev, struct pl061 *pl061)
{
    rt_err_t err = RT_EOK;
    struct rt_ofw_node *np = pdev->parent.ofw_node;

    // 对 pl061 的 0 号内存资源初始化
    pl061->base = rt_ofw_iomap(np, 0);

    if (pl061->base)
    {
        // 获取 pl061 的 0 号中断资源
        pl061->irq = rt_ofw_get_irq(np, 0);

        if (pl061->irq < 0)
        {
            err = -RT_ERROR;
        }
        else
        {
            // 设置 ofw 结点中的设备信息
            rt_ofw_data(np) = &pl061->parent;
        }
    }
    else
    {
        err = -RT_EIO;
    }

    return err;
}

static rt_err_t pl061_probe(struct rt_platform_device *pdev)
{
    rt_err_t err = RT_EOK;
    struct pl061 *pl061 = rt_calloc(1, sizeof(*pl061));

    if (pl061)
    {
        // 根据设备树的信息对 pl061 进行初始化
        err = pl061_ofw_init(pdev, pl061);
    }
    else
    {
        err = -RT_ENOMEM;
    }

    if (!err)
    {
        // 设备特定初始化
        rt_spin_lock_init(&pl061->spinlock);

        pl061->parent.irqchip.irq = pl061->irq;
        pl061->parent.irqchip.pin_range[0] = 0;
        pl061->parent.irqchip.pin_range[1] = PL061_GPIO_NR - 1;
        pl061->parent.ops = &pl061_pin_ops;
        pin_pic_init(&pl061->parent);

        // 注册设备
        rt_device_pin_register("gpio", &pl061_pin_ops, pl061);

        // 设置中断服务例程
        rt_hw_interrupt_install(pl061->irq, pl061_isr, pl061, "gpio-pl061");
        rt_hw_interrupt_umask(pl061->irq);
    }
    else
    {
        rt_free(pl061);
    }

    return err;
}
```

由上程序也可知，设备树中 pl061 设备结点编写需要提供一个中断资源及一个 IO 资源，下面的示例结点可以被 pl061 驱动处理：

```dts
/pl061{
    compatible = "arm,pl061";
    reg = <0x40000 20>;
    // 指定中断控制器，需要定义 interrupt-controller 结点
    interrupt-parent = <&interrupt-controller>;
    interrupts = <20 0>;
}
```

- reg 的格式由其父结点的 #address-cells 和 #size-cells 指定，这里假定均为 1。
- interrupts 格式由其指定的中断控制器 (这里是 interrupt-controller) 的 #interrupt-cells 指定，这里假定其为 2。

### 说明编写

驱动编写者需要提供该驱动如何与设备绑定相关说明，告知设备树编写者如何编写该驱动支持的设备结点。

说明需要包含如下方面：

- 驱动所支持的 compatible 属性或可以匹配的设备名称；
- 设备必须指定及可以指定的属性，并给出属性含义及属性值的形式；