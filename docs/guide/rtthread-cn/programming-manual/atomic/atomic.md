# 原子操作 #

## 原子操作简介

原子操作（Atomic operation）是指一种不可分割的操作，要么完全执行成功，要么完全不执行。原子操作的执行过程中不允许有任何中断，如果出现了中断，那么操作的结果就无法保证。原子操作通常用于多线程编程中，保证多个线程之间的并发执行不会出现数据竞争等问题。在实现原子操作时，通常使用硬件指令或者操作系统提供的原子操作函数来保证操作的原子性。 在应用层面，原子操作可以用于实现一些高级的同步和并发控制机制。例如，在多线程编程中，如果多个线程都需要访问同一个共享变量，为了避免数据竞争问题，可以使用原子操作来保证对该变量的操作是原子的。我们以 ARM 内核执行一个 i++操作为例：

```c
movl i, %eax                            //内存访问，读取 i 变量到 cpu 的 eax 寄存器
addl $1, %eax                           //修改寄存器的值
movl %eax, i                            //将寄存器中的值写回内存
```

我们看到对于编码的工程师我们执行一个 i++的操作仅需一行代码，在编译后 i++就会被翻译成三条指令，所以在这三条指令之间是可能会被系统调度、中断等事件打断的，因而我们在一些场景就需要一气呵成执行完上述操作，原子操作就具备这样的能力。

## 原子操作的优点

在 RT-Thread 中我们可以采取开关全局中断，调度器上锁等方式对临界区资源进行保护，其他 OS 也会提供类似的操作，若采用原子操作后我们可以提高临界区代码的执行效率，大幅提升系统的运行效率，同时也会在一定程度上降低编程的复杂度，下文是一个简单变量自增的示例：

采用开关全局中断的方式实现的对临界区的保护：

```c
  ...  
	int a = 5;
    level = rt_hw_interrupt_disable();
    a++;
    rt_hw_interrupt_enable(level);
  ...
```

我们若采用 RT-Thread 提供的原子操作 API 可以这么做：

```c
  ...  	
	int a = 5;
	rt_atomic_add(&a,1);
  ...  
```

显然采用原子操作的方式更加简单一些，且避免了开关全局中断带来的性能损失。

## RT-Thread 原子操作的实现与使用方法 ##

RT-Thread 对 32-bit 的 ARM、32-bit 的 RISC-V 与 64-bit 的 RISC-V 中支持原子操作的内核提供了原子操作支持，使用对应平台的原子操作指令与相关指令实现，默认支持，无需用户关心实现，用户使用时仅需在工程包含`rtatomic.h`即可使用该文件提供的原子操作 API，详细支持情况如下：

|   指令架构    |             RT-Thread 适配内核的原子指令支持情况              |
| :-----------: | :----------------------------------------------------------: |
|  32-bit ARM   | 采用 ARM 指令集的绝大多数内核支持原子指令，不支持的内核有 cortex-m0，cortex-m0+，arm926，lpc214x，lpc24xx，s3c24x0，AT91SAM7。 |
| 32-bit RISC-V | 采用 RV32 指令集的大部分内核支持原子操作，部分不支持的 BSP 有：core-v-mcu，rv32m1_vega。 |
| 64-bit RISC-V | 采用 RV64 指令集的大部分内核支持原子操作，部分不支持的 BSP 有：juicevm。 |

若工具链支持 C11 标准的原子操作 API 也可以使用 menuconfig 配置`RT_USING_STDC_ATOMIC` 宏，此时调用`rtatomic.h`中提供的宏实际上最终会调用 C11 标准提供的 API，menuconfig 的配置方法如下：
```shell
RT-Thread Kernel --->
   [*]Use atomic implemented in stdatomic.h
```

上述不支持原子操作的内核，用户在工程中包含`rtatomic.h`并使用该文件提供的 API 时，此时会采用开关全局中断的方式软实现原子操作。

## RT-Thread 原子操作 API

RT-Thread 提供了 11 个使用频率较高的原子操作 API。

|                     RT-Thread 原子操作 API                     |                           作用                           |
| :----------------------------------------------------------: | :------------------------------------------------------: |
|   rt_atomic_t rt_hw_atomic_load(volatile rt_atomic_t *ptr)   |                原子的从 ptr 地址加载一个字                 |
| void rt_atomic_store(volatile rt_atomic_t *ptr, rt_atomic_t val) |                  原子的将 val 写入 ptr 地址                  |
| rt_atomic_t rt_atomic_exchange(volatile rt_atomic_t *ptr, rt_atomic_t val) |              原子的将 ptr 地址处的值替换为 val              |
| rt_atomic_t rt_atomic_add(volatile rt_atomic_t *ptr, rt_atomic_t val) |              原子的将 ptr 地址处的值与 val 相加              |
| rt_atomic_t rt_atomic_sub(volatile rt_atomic_t *ptr, rt_atomic_t val) |              原子的将 ptr 地址处的值与 val 相减              |
| rt_atomic_t rt_atomic_xor(volatile rt_atomic_t *ptr, rt_atomic_t val) |            原子的将 ptr 地址处的值与 val 按位异或            |
| rt_atomic_t rt_atomic_and(volatile rt_atomic_t *ptr, rt_atomic_t val) |             原子的将 ptr 地址处的值与 val 按位与             |
| rt_atomic_t rt_atomic_or(volatile rt_atomic_t *ptr, rt_atomic_t val) |             原子的将 ptr 地址处的值与 val 按位或             |
| rt_atomic_t rt_atomic_flag_test_and_set(volatile rt_atomic_t *ptr) |                 原子的将 ptr 地址处的值置 1                 |
|     void rt_atomic_flag_clear(volatile rt_atomic_t *ptr)     |                 原子的将 ptr 地址处的值清 0                 |
| rt_atomic_t rt_atomic_compare_exchange_strong(volatile rt_atomic_t *ptr, rt_atomic_t *old, rt_atomic_t new) | 原子的将 ptr 地址处的值与 val 进行比较与交换，并返回比较结果 |

原子操作函数详细的释义：

#### 原子读

```c
rt_atomic_t rt_atomic_load(volatile rt_atomic_t *ptr);
```

该操作函数的语义为：使用原子操作方式从 ptr 地址指向的 4 字节空间加载一个字。

|  **参数**  | **描述**                     |
|------|-------------------------|
| ptr | 原子对象地址 |
| **返回值** | 返回 ptr 地址处的 4 字节数据 |

#### 原子写

```c
void rt_atomic_store(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 val 写入 ptr 地址指向的 4 字节空间。

|  **参数**  | **描述**                     |
|------|-------------------------|
| ptr | 原子对象地址 |
| val | 期望写入 ptr 地址处的数据 |
| **返回值** | NULL |

#### 原子数据交换

```c
rt_atomic_t rt_atomic_exchange(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 ptr 地址指向的 4 字节空间的数据交换为 val，返回 ptr 地址处修改前的 4 字节数据。

| **参数**   | **描述**             |
|------|-----------------|
| ptr        | 原子对象地址       |
| val        | 期望交换的数据                 |
| **返回值** | 返回 ptr 地址处交换前的 4 字节数据 |

#### 原子加

```c
rt_atomic_t rt_atomic_add(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 ptr 地址指向的 4 字节数据与 val 相加，将结果写入 ptr 地址指向的 4 字节空间，返回 ptr 地址处修改前的 4 字节数据。

| **参数**   | **描述**                       |
| ---------- | ------------------------------ |
| ptr        | 原子对象地址                   |
| val        | 期望相加的值                   |
| **返回值** | 返回 ptr 地址处修改前的 4 字节数据 |

#### 原子减

```c
rt_atomic_t rt_atomic_sub(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 ptr 地址指向的 4 字节数据减去 val，将结果写入 ptr 地址指向的 4 字节空间，返回 ptr 地址处修改前的 4 字节数据。

| **参数**   | **描述**                       |
| ---------- | ------------------------------ |
| ptr        | 原子对象地址                   |
| val        | 期望减去的值                   |
| **返回值** | 返回 ptr 地址处修改前的 4 字节数据 |

#### 原子异或

```c
rt_atomic_t rt_atomic_xor(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 ptr 地址指向的 4 字节数据与 val 进行按位异或，将结果写入 ptr 地址指向的 4 字节空间，返回 ptr 地址处修改前的 4 字节数据。

| **参数**   | **描述**                       |
| ---------- | ------------------------------ |
| ptr        | 原子对象地址                   |
| val        | 期望异或的值                   |
| **返回值** | 返回 ptr 地址处修改前的 4 字节数据 |

#### 原子与

```c
rt_atomic_t rt_atomic_and(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 ptr 地址指向的 4 字节数据与 val 进行按位相与，将结果写入 ptr 地址指向的 4 字节空间，返回 ptr 地址处修改前的 4 字节数据。

| **参数**   | **描述**                       |
| ---------- | ------------------------------ |
| ptr        | 原子对象地址                   |
| val        | 期望相与的值                   |
| **返回值** | 返回 ptr 地址处修改前的 4 字节数据 |

#### 原子或

```c
rt_atomic_t rt_atomic_or(volatile rt_atomic_t *ptr, rt_atomic_t val);
```

该操作函数的语义为：使用原子操作方式将 ptr 地址指向的 4 字节数据与 val 进行按位相或，将结果写入 ptr 地址指向的 4 字节空间，返回 ptr 地址处修改前的 4 字节数据。

| **参数**   | **描述**                       |
| ---------- | ------------------------------ |
| ptr        | 原子对象地址                   |
| val        | 期望相或的值                   |
| **返回值** | 返回 ptr 地址处修改前的 4 字节数据 |

#### 原子标志检查与置位

```c
rt_atomic_t rt_atomic_flag_test_and_set(volatile rt_atomic_t *ptr);
```

该操作函数的语义为：对 ptr 地址指向的 4 字节原子标志进行设置，并返回该原子标志对象做设置操作之前的值。若 ptr 地址指向的 4 字节数据之前状态为 0，那么经过此操作之后，该原子标志对象的状态变为了状态 1，并且返回 0 。如果 ptr 地址指向的 4 字节数据之前为状态 1，那么经过此操作之后，它仍然为状态 1，并且返回 1。所以若我们将原子标志对象作为一个“锁”来用的话，可判断这个函数接口的返回值，若返回 0，则说明锁成功，可以对多线程共享对象做相关的修改操作；如果返回的是 状态 1，则该原子标志已经被其他线程占用，需等待释放。

| **参数**   | **描述**                                        |
| ---------- | ----------------------------------------------- |
| ptr        | 原子对象地址，此处地址指向的 4 字节数据只能为 0 或 1 |
| **返回值** | 设置状态                                        |

#### 原子标志清除

```c
void rt_atomic_flag_clear(volatile rt_atomic_t *ptr);
```

该操作函数的语义为：清除标志，将标志清 0，对 ptr 地址指向原子标志进行清零操作。如果我们将原子标志对象用作“锁”的话，那么执行此操作就相当于释放锁。

| **参数**   | **描述**     |
| ---------- | ------------ |
| ptr        | 原子对象地址 |
| **返回值** | NULL         |

#### 原子比较与交换

```c
rt_atomic_t rt_atomic_compare_exchange_strong(volatile rt_atomic_t *ptr, rt_atomic_t *old, rt_atomic_t new);
```

该操作函数的语义为：第一个参数指向原子类型对象；第二个参数指向要进行比较的对象，并且如果比较失败，那么该操作会将原子对象的当前值拷贝到该参数所指向的对象中；第三个参数指定存储到原子对象中的值。 如果比较成功，那么 new 值会被存放到原子对象中，并且返回 1；如果比较失败，那么当前原子对象的值会被拷贝到 old 所指向的对象中，并且返回 0。

| **参数**   | **描述**       |
| ---------- | -------------- |
| ptr        | 原子对象地址   |
| old        | 被比较的对象   |
| new        | 期望更新的对象 |
| **返回值** | 比较结果       |

## 综合示例

在工程中包含`rtatomic.h`，然后将示例添加至工程即可进行简单的原子操作验证。

```c
/* 在工程中添加该头文件 */
#include <rtatomic.h>

rt_atomic_t value1 = 10;
rt_atomic_t value2 = 5;
int main(void)
{
    /* atomic add */
    int result = rt_atomic_add(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic sub */
    result = rt_atomic_sub(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic xor */
    result = rt_atomic_xor(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic or */
    result = rt_atomic_or(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic and */
    result = rt_atomic_and(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic exchange */
    result = rt_atomic_exchange(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic compare and exchange */
    result = rt_atomic_compare_exchange_strong(&value1, value2, 6);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    /* atomic load */
    result = rt_atomic_load(&value1);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 10;
    value2 = 5;
    /* atomic store */
    result = rt_atomic_store(&value1, value2);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    value1 = 0;
    /* atomic flag test and set */
    result = rt_atomic_flag_test_and_set(&value1);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);

    /* atomic flag clear */
    result = rt_atomic_flag_clear(&value1);
    rt_kprintf("result = %d value1 = %d value2 = %d\r\n", result, value1, value2);
}
```