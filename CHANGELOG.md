# 更新日志 / Changelog

## 0.3.0（2026-08）

### 新增
- 配置 GitHub Pages 发布与 CI：
  - 新增 `.github/workflows/deploy.yml`：推送 `main` / 手动触发 → pnpm 构建 → 部署到 GitHub Pages。
  - `docs/.vitepress/config.mjs` 增加 `base` 自适应：由 `REPO_NAME` 推导（项目页 `/repo/`、用户主页 `/`），支持 `BASE_PATH` 显式覆盖；本地默认 `/`。
  - 自测页内联链接改用 `withBase`，保证部署到子路径时导航/阅读页链接不 404。
  - README 增加发布与 CI 使用说明（GitHub Pages / Gitee / Netlify / Vercel）。

### 说明
- 需要在仓库 Settings → Pages 选择「GitHub Actions」作为发布源。
- 请把 `config.mjs` 中 `GITHUB_REPO` 默认占位地址替换为你的仓库地址（CI 发布时自动注入真实值）。
