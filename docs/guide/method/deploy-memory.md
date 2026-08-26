---
title: 部署与推拉记忆（本机备忘）
---

# 部署与推拉记忆（本机备忘）

> 这一页记录**把本手册发布到 GitHub Pages 的完整流程**，以及**本机推拉时踩过的坑（尤其代理）**。纯备忘，避免下次再查一遍。

## 一、发布链路（GitHub Pages + Actions）

```
本地提交 → push origin main → GitHub Actions(deploy.yml) 自动构建 → 发布到 GitHub Pages
```

- **触发**：`push → main`，或手动 `workflow_dispatch`（见 `.github/workflows/deploy.yml`）。
- **关键前提**：仓库 **Settings → Pages → 分支 → 选择「GitHub Actions」** 作为发布源（不是选分支）。这一步不配，CI 的 deploy 不会生效，只跑 build。
- **构建内容**：云端 `pnpm install --frozen-lockfile && pnpm build`；
  - `REPO_NAME` 环境变量让 VitePress 自动推导 `base`（项目页 `/<repo>/`，用户主页 `/`）。
  - 产物输出到 `docs/.vitepress/dist`，由 `actions/upload-pages-artifact` 上传并发布。
- **验证**：仓库 **Actions** 页看 `Deploy VitePress site to GitHub Pages`（build+deploy）；**Pages** 页看访问地址。

> `docs/.vitepress/dist`、`cache` 已在 `.gitignore`，不入库；依赖 `node_modules/` 也忽略。构建产物由 CI 在云端生成。

## 二、本机推拉与代理（重点：别被 `http.proxy` 坑了）

### 踩过的坑
- git 全局配置里残存 **`http.proxy=http://127.0.0.1:7897`**（某次梯子留下的）。当你用的是 **TUN/系统级全局代理**时，这个显式 HTTP 代理**不转发 GitHub、且和 TUN 互斥**，导致 `git push` 一直卡死/超时（curl 走它也是 `000`）。
- 直连 `github.com` 若被墙，又会超时/`reset`，看起来"哪都不通"。

### 正确的推法（TUN 全局代理下）
去掉显式代理、走**直连**让 TUN 接管，并强制 HTTP/1.1（避免握手被 reset）：
```bash
git -c http.proxy= -c https.proxy= -c http.version=HTTP/1.1 push origin main
```
- 关键三件套：**清 `http.proxy`/`https.proxy`（用空值覆盖）+ `http.version=HTTP/1.1`**。
- 判定：先 `curl -sS -o NUL -w "%{http_code}" --max-time 20 https://github.com` 看是否为 `200`（`000` 说明当前网络/代理不通）。

### 一劳永逸（可选）
如果一直用 TUN/系统代理，可清掉失效的显式代理，以后直接 `git push`：
```bash
git config --global --unset http.proxy
```
（反过来，若你确实要**显式代理**（如 Clash 的 7897 HTTP 端口），就保留该配置；两种情况别混用。）

## 三、内容章节导航（新增）

- **「STM32 + FreeRTOS 深挖」**：`/guide/rtos/`，24 道题的自测清单，按 **基础概念 → 中断与现场保护 → 任务切换与上下文 → RTOS 核心机制 → 工程落地 → 调试与排查** 六段递进。
  - 覆盖：中断现场保护 vs 任务上下文切换、Cortex-M 异常帧/`EXC_RETURN`、`PendSV`/`SysTick`/`SVC`、TCB/`pxTopOfStack`、FreeRTOS 两阶段切换源码、信号量 vs 互斥锁、优先级反转、任务通知 vs 队列、中断传数、看门狗、HardFault 定位、栈溢出、CPU 占用率。
  - 相关章节对照：`/guide/os/`（通用机制）、`/guide/arm/`（Cortex-M 与移植）、`/guide/mcu/`（NVIC/EXTI/时钟树）。

## 四、题卡维护速查

- **新题卡**：新建 `docs/guide/<分类>/q-<slug>.md`，front-matter 需含 `id/title/category/difficulty/tags/company/keywords/answer/why`（`scripts/proofread.mjs` 会校勘必需字段）。
- **侧边栏**：在 `docs/.vitepress/config.mjs` 的 `sidebar` 数组里加条目（新分类或新题链接）。
- **自测数据源**：`docs/.vitepress/theme/deck.js` 用 `import.meta.glob('../../**/q-*.md')` 自动装载所有题卡，`id` 必须全局唯一（否则进度/错题本会串）。
- **校勘**：`pnpm proofread`（检查所有题卡 front-matter）。**id 不要与现有题重复**。

---

> 📌 一句话记忆：**发布 = push main → Actions 自动 build/deploy，前提是 Pages 发布源选「GitHub Actions」；TUN 代理下推 Git 需清 `http.proxy` 并强制 HTTP/1.1；新题卡 q-*.md 需 9 个字段 + 唯一 id，且要在 config.mjs 挂侧边栏。**
