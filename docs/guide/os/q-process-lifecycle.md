---
title: 进程生命周期（僵尸/孤儿/守护）
id: process-lifecycle
category: os
difficulty: 3
tags: [操作系统, 进程]
company: [中兴, 海康威视]
keywords: 进程状态 僵尸进程 孤儿进程 守护进程 fork wait reap
answer: |
  **进程状态**：新建/就绪/运行/阻塞/终止。
  - **创建**：`fork`（复制）→ `exec`（替换成新程序）。
  - **退出**：`exit`；父进程 `wait`/`waitpid` 回收（**reap**）。
  **僵尸进程（zombie）**：进程已**终止**（资源已释放），但 **PCB 仍留在进程表**（父进程未 `wait` 回收）→ 占据一个 PID/进程表项。**避免**：父进程 `wait`、提前 `SIGCHLD` 处理、或在父进程能 wait 前及时回收。
  **孤儿进程（orphan）**：**父进程先退出**，子进程被 **init（pid 1）收养**（reparent）并由 init 回收。
  **守护进程（daemon）**：**脱离终端、无控制终端**、常驻后台的服务（`setsid` 新会话、`fork`+`setsid`、改工作目录、关闭 stdin/out/err 等），如 `sshd`、`crond`、嵌入式中的后台服务。
why: |
  进程的“**创建→运行→退出→回收**”是 Linux 进程模型基础。**僵尸**=退出但没被 `wait`（PCB 残留、占 PID，多而耗尽 PID）；**孤儿**=父先死被 init 收养（避免无人回收）；**守护进程**=后台常驻服务。
  会写/会答这几题 = 理解进程生命周期与并发管理，也是排查“**PID 被占、一堆 <defunct>（僵尸）**”问题的关键。
---
<FlashCard />

## 深读

### 状态与回收

```
fork → 就绪 → 运行 → 阻塞(等I/O/事件) → 就绪
                  ↓ exit
                终止(僵尸) --父wait--> 回收
```

- 进程结束 `exit` 后成为**僵尸**，直到父进程 `wait` 回收其 PCB。

### 僵尸 vs 孤儿

| | 僵尸 | 孤儿 |
|---|---|---|
| 状态 | 已终止但 PCB 在 | 父已死 |
| 原因 | 父未 wait | 父先退出 |
| 后果 | 占 PID/进程表 | 被 init 收养回收 |
| 处理 | 父 wait；或忽略 SIGCHLD | init 自动回收 |

### 守护进程要点

```c
// 基本步骤
if (fork() > 0) exit(0);   // 父进程退出
setsid();                  // 新会话，脱离控制终端
// 可再 fork 一次、chdir("/")、umask
// 关闭 stdin/stdout/stderr，重定向到 /dev/null
```

- **脱离终端**：不被 SIGHUP 影响，后台常驻。
- 嵌入式里常用于**系统服务/日志/采集后台**。

### 常见追问

- 什么是僵尸进程？——已 exit 但未 wait 回收，PCB 残留占 PID。
- 怎么避免？——父进程及时 `wait`/`waitpid`，或设 `SIGCHLD=SIG_IGN` 让内核自动回收。
- 孤儿进程谁回收？——init(pid 1)；现在可被 `subreaper` 或指定进程收养。
- 守护进程为什么双重 fork？——确保子进程不是进程组组长，能 `setsid` 成功。

> 📌 一句话记忆：**僵尸=退出未 wait（占PID）；孤儿=父先死被 init 收养；守护进程=脱离终端后台常驻；用 wait 回收、fork+setsid 做 daemon。**
