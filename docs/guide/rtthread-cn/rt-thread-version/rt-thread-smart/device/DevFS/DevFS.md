# DevFS设备管理

## 简介

DevFS 设备管理即使用文件系统的接口访问设备。在用户态程序中只允许使用这种方式访问设备。

整体框架图如下所示：



最上面一层是用户层，

第二层就是 DevFS 设备管理层，向上层提供标准接口，DevFS 设备框架提供给用户层的接口是 open/close/read/write/ioctl/poll/lseek ；并向下层提供 fops（文件操作函数集合） 集合，供驱动注册设备。

第三层是驱动的实现，对于 UART 来说，它有对应的设备框架，因此需要先注册成标准 Device 设备，然后由框架完成 fops 的对接。对于 I2C总线、SPI总线设备来说，他们和 UART 一样也需要先注册成标准 Device 设备，但是总线类设备并不会注册 fops 接口，因此用户态 APP 无法访问总线设备。对于 EEPROM、LCD、ESAM 等功能外设来说，他们需要自己实现 fops 里需要实现的接口，并完成设备的注册。

最下面一层是，芯片厂商提供的标准库。

> 注意：由上图可以看出，使用 open/close/read/... 这些 DevFS 设备管理框架提供的 API 既可以操作 UART设备，又可以操作 EEPROM 等功能外设设备。但是 Device 设备框架提供的 rt_device_open/rt_device_close/... 等API 就只可以控制 UART 和 I2C/SPI 总线设备，不能控制 EEPROM 等功能外设。

## APP访问外设示例

DevFS 设备底层驱动实现之后会向内核注册对应的设备，例如，UART驱动里就可能会向系统注册一个名称为 “UART1”、一个 “UART2” 的设备。LCD 驱动实现之后就会向内核注册一个名称为 "LCD" 的设备。那么如何访问这些设备呢？

 DevFS 设备框架提供给用户层的接口是 `open/close/read/write/ioctl/poll/lseek`

假设我们有一个按键设备，名称为 key0，我们规定读此按键设备的意义是：读按键是否有事件发生。这里只检查按 键按下的事件，如果有按键按下的事件发生，就会返回此事件，否则返回错误。

示例程序如下：

```c
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>

/* Defines the event in which the key is pressed */
#define EVENT_KEY_PRESS   10
#define KEY0_DEVICE_PATH  "/dev/key0"

int main(void)
{
    int fd;
    int value;

    /* Open the device, default by blocking mode */
    fd = open(KEY0_DEVICE_PATH, O_RDONLY);
    if (fd < 0)
    {
        printf("open device failed\n");
        return 0;
    }

    printf("Please press the USER button\n");
    /* read data */
    if(read(fd, &value, 1) == 1)
    {
        if (value == EVENT_KEY_PRESS)
            printf("key press\n");
    }

    close(fd);
    
    printf("The program will exit\n");

    return 0;
}
```

这个程序将以阻塞的模式打开 KEY0 设备，然后阻塞的去读设备的事件，只有当设备发生事件时才返回。然后判断发生的事件是否为按键按下事件。

**poll 接口使用示例:**

假设我们规定 KEY0 外设驱动注册的实现需要 poll 接口，当按键事件发生时上报 POLLIN 事件的发生。这样应用层就可以使用 poll 接口监听按键按下事件的发生了。

这个示例程序利用 poll 接口监听 KEY0 设备的 POLLIN 事件的发生，并设置超时时间为 1S, 若连续 5 次都监听超时就退出程序。如果监听到 POLLIN 事件的发生就打印 `Key press` 。

```c
#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>

#define KEY0_DEVICE_PATH  "/dev/key0"

int main(void)
{
    int fd;
    int count = 0;
    struct pollfd fds[1];
    
    /* Open the device by non-blocking mode */
    fd = open(KEY0_DEVICE_PATH, O_RDONLY | O_NONBLOCK);
    if (fd < 0)
    {
        printf("open device failed\n");
        return -1;
    }

    /* Add the fd to monitor */
    fds[0].fd = fd;
    fds[0].events = POLLIN;
    
    printf("Please press the USER button\n");
    printf("If the button is not pressed within 5S, the program will exit\n");
    do
    {
        /* Monitor button status, timeout 1S */
        if (poll(fds, 1, 1000) > 0 && fds[0].revents & POLLIN)
        {
            printf("Key press\n");
            count = 0;
        }
        else
        {
            count++;
        }
    }
    while(count < 5);
    
    close(fd);
    
    printf("The program will exit\n");
    
    return 0;
}
```

## 功能外设注册示例

功能外设，顾名思义就是完成特定功能的外设，这些外设需要按照规范的要求，完成 fops 里对应的函数，并注册成为一个设备，就可以了。下面以按键设备 KEY0 为例演示功能外设的注册。

功能外设的注册，分为如下几步：

1. 实现 DevFS 设备框架提供的相应的 fops 接口
2. 定义设备框架 fops 结构体，并完成成员的赋值。
3. 实现设备初始化函数，在函数里完成设备的注册。
4. 利用自动初始化的宏将设备初始化的函数导出

```c
#include <rtthread.h>
#include <rtdevice.h>
#include <board.h>
#include <poll.h>
#include <dfs_file.h>

#define GET_PIN(PORTx, PIN) (32 * (PORTx - 1) + (PIN & 31))
#define USER_KEY GET_PIN(7, 13) // PG13

static uint8_t is_init;
static uint8_t key_state;
static uint8_t key_state_old;
static rt_device_t device;

void irq_callback()
{
    /* enter interrupt */
    key_state = rt_pin_read(USER_KEY);
    rt_interrupt_enter();
    rt_wqueue_wakeup(&(device->wait_queue), (void *)POLLIN);
    /* leave interrupt */
    rt_interrupt_leave();
}

static void drv_key_init(void)
{
    key_state = 1;
    key_state_old = 1;
    rt_pin_mode(USER_KEY, PIN_MODE_INPUT);
    rt_pin_attach_irq(USER_KEY, PIN_IRQ_MODE_RISING_FALLING, irq_callback, RT_NULL);
    rt_pin_irq_enable(USER_KEY, PIN_IRQ_ENABLE);
}

/* Open the key device, and initialize the hardware the first time you open it */
static int drv_key_open(struct dfs_fd *fd)
{
    if (!is_init)
    {
        is_init = 1;
        /* Initialize the hardware */
        drv_key_init();
    }
    /* Increase reference count */
    device->ref_count ++;
    return 0;
}
/* Close the key device, and reset the hardware when the device is no longer in use */
static int drv_key_close(struct dfs_fd *fd)
{
    /* Reduced reference count */
    device->ref_count --;
    /* Reset the hardware when the device is no longer in use */
    if (device->ref_count == 0)
    {
        /* ... */
        is_init = 0;
    }
    return 0;
}

/* Read key state */
static int drv_key_read(struct dfs_fd *fd, void *buf, size_t count)
{
    *(int *)buf = !rt_pin_read(USER_KEY);
    return 1;
}

/* Use poll to check the state of the key */
static int drv_key_poll(struct dfs_fd *fd, struct rt_pollreq *req)
{
    int mask = 0;
    int flags = 0;

    /* only support POLLIN */
    flags = fd->flags & O_ACCMODE;
    if (flags == O_RDONLY || flags == O_RDWR)
    {
        /* Add to wait queue, suspend the current thread */
        rt_poll_add(&(device->wait_queue), req);
        /* If the key is pressed, mark a POLLIN event */
        if (key_state != key_state_old)
        {
            key_state_old = key_state;
            mask |= POLLIN;
        }
    }
    return mask;
}

/*
 * Realize the fops variables.
 */
static struct dfs_file_ops drv_key_fops =
{
    drv_key_open,
    drv_key_close,
    RT_NULL,
    drv_key_read,
    RT_NULL,
    RT_NULL,
    RT_NULL,
    RT_NULL,
    drv_key_poll,
};

/*
 * Key device initialization function.
 */
static int rt_hw_key_init(void)
{
    rt_err_t ret;

    /* 1. Allocates memory for device structures, Use the calloc function */
    device = rt_calloc(1, sizeof(struct rt_device));
    if (device == RT_NULL)
    {
        return -1;
    }

    /* 2. Set to miscellaneous device */
    device->type = RT_Device_Class_Miscellaneous;

    /* 3. register a key device */
    ret = rt_device_register(device, "key0", RT_DEVICE_FLAG_RDONLY);
    if (ret != RT_EOK)
    {
        rt_free(device);
        return ret;
    }
    /* 4. set fops */
    device->fops = &drv_key_fops;

    return ret;
}
/* Using below macro to export this function, the function will be called automatically after kernel startup */
INIT_DEVICE_EXPORT(rt_hw_key_init);
```

## 注意事项

- 在实现设备初始化代码时，应只包含设备注册代码，不能进行相应硬件的初始化。硬件的初始化应在设备第一
次打开被使用时。
- fops 的赋值一定要放在设备注册之后。
- fops 的实现应根据各自功能外设的特性，选择需要实现的函数并进行实现。
- fops 里面的 close 函数会在空闲处理函数里被调用，所以请不要在 close 里使用可能会挂起当前线程的的 API, 如：suspend,rt_sem_take 等，以防挂起 idle 线程导致系统异常。
- INIT_BOARD_EXPORT 宏导出的函数的运行环境是 OS 调度器还没启动的时候，因此，在函数内部不可以使用有关系统调度相关的 API, 如：rt_thread_delay/mdelay。