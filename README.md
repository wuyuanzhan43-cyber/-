# 嵌入式八股面试手册

> 一本「**题卡 + 标准答案 + 为什么 + 自测**」的本地优先嵌入式八股手册。
> 纯静态站点，离线可用，无后端、无账号、无服务。

## 特性

- **题卡 + 深读双层**：每题先给「题 → 标准答案 → 为什么」，再展开图解与深读。
- **记忆曲线自测**：卡片打分「熟/生」走 SM-2 间隔重复，进度记录在本地浏览器（localStorage）。
- **AI 讲解（可选，BYO Key）**：自填 API Key 即可让 AI 针对每道题讲解，且**锚定标准答案（ground truth）**抑制幻觉。密钥仅存本地、只发给用户填写的 provider。
- **分类树 + 本地全文搜索**：沿用验证过的嵌入式命题骨架（C / OS / Linux / 驱动 / ARM / 总线 / 工具链）。
- **本地优先**：构建产物为纯静态，可部署到任意静态托管，或本地离线浏览。

## 快速开始

```bash
# 安装依赖
pnpm install

# 本地开发（热更新）
pnpm dev

# 构建静态产物（输出到 docs/.vitepress/dist）
pnpm build

# 本地预览构建产物
pnpm preview

# 校勘所有题卡的 front-matter 是否完整
pnpm proofread
```

## 项目结构

```
docs/
  index.md                    # 首页
  study.md                    # 自测刷题页（做题 + 进度 + 错题本）
  guide/
    readme.md                 # 手册说明
    c/  ds/  os/  linux/  arm/  bus/  method/   # 分类目录
      每个分类下: index.md（概览）+ q-*.md（一道题卡）
  .vitepress/
    config.mjs                # 站点配置：分类树导航 / 本地搜索
    theme/
      deck.js                 # 题卡 front-matter 装载器（自测数据源）
      storage.js              # 进度/记忆曲线/错题本(localStorage)
      components/             # FlashCard / StudyView / CardBadge 组件
scripts/
  proofread.mjs               # 题卡校勘
```

## 题卡格式

每道题是一个 `q-*.md`，front-matter 带元数据，正文是可交互 `<FlashCard>` + 深读：

```markdown
---
title: ...
id: ...
category: ...
difficulty: 2
tags: [c, 编译器]
company: [华为]
answer: |
  ...标准答案...
why: |
  ...为什么/讲解...
---

<FlashCard />

## 深读
...详细讲解与代码...
```

## 路线图

- [x] 骨架 + 交互（自测/记忆曲线/错题本）
- [x] ~30 道核心高频题（求深不求全）
- [x] AI 讲解（BYO Key，锚定标准答案）
- [ ] 更多章节与题量
- [ ] 版本/勘误维护机制

## License

内容为自著整理，仅供个人学习参考。开源发布时将采用明确 License（内容 CC 类、代码 Apache-2.0）。引用他人材料会标注来源。

## 部署到 GitHub Pages（含 CI）

已内置 GitHub Actions 工作流（`.github/workflows/deploy.yml`）：推送到 `main` 或手动 `workflow_dispatch` 会自动构建并发布到 GitHub Pages。

### 步骤

1. 把本项目推到 GitHub 仓库。
2. 仓库 **Settings → Pages → 分支** 选择 **GitHub Actions**（发布源用 Actions，不是分支）。
3. 首次提交后 Action 会自动构建并部署。

### base 路径自适应

配置会从环境变量自动推导 `base`（见 `docs/.vitepress/config.mjs`）：

- **项目页**（`https://user.github.io/<repo>/`）→ 自动用 `/<repo>/`。
- **用户主页**（`https://user.github.io/`，仓库名为 `<user>.github.io`）→ 自动用 `/`。
- 也可用 `BASE_PATH` 显式指定，或自定义域名时设为 `/`。

**本地开发/预览**默认 `base = '/'`，无需手动改；只有部署到子路径时才用环境变量。

### 常见发布通道

- **GitHub Pages**：官方工作流（推荐）。
- **Gitee Pages / 其它静态托管**：直接上传 `docs/.vitepress/dist` 且 `base = '/'`。
- **Netlify / Vercel**：构建命令 `pnpm install && pnpm build`，发布目录 `docs/.vitepress/dist`，`base = '/'`。

> ⚠️ 请把 `docs/.vitepress/config.mjs` 里的 `GITHUB_REPO` 默认占位地址换成你的仓库地址（发布后 CI 会自动注入真实地址）。

