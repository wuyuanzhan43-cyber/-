# 更新日志 / Changelog

## 0.4.0（2026-08）

### 新增
- 扩充题卡至 40 道：新增 10 道嵌入式高频题。
  - C：函数指针与回调
  - ARM：STM32 启动过程
  - OS/RTOS：自旋锁 vs 睡眠锁、系统调用 vs 库函数、实时性与时延指标
  - Linux：内存泄漏检测与 OOM、mmap 映射与零拷贝、驱动模型三件套（bus/device/driver）
  - 工具链：交叉编译
  - 总线：NOR vs NAND Flash
- GitHub Actions 升级到支持 Node 24 的最新版（checkout v7 / setup-node v7 / configure-pages v6 / upload-pages-artifact v5 / deploy-pages v5 / pnpm action-setup v6），消除 Node 20 弃用告警。

### 说明
- 题卡数量：40；front-matter 校勘全部通过。
- 其余不变：纯静态 + localStorage，无后端。
