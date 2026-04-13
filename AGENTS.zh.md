# Repository Guidelines（中文版）

## 项目结构与模块组织
- `app/`：Next.js App Router 页面、布局与 API 路由（`app/api/**/route.ts`）。
- `components/`：可复用 React 组件；`components/ui/*` 为基础 UI 组件。
- `lib/`：核心逻辑（驱动、环境变量解析、数据获取、轮询、地理信息工具）。
- `messages/` 与 `i18n/`：多语言文案与国际化配置。
- `public/`：静态资源与 PWA 图标；`styles/` 存放全局样式。
- `docker/`：容器部署示例；`.github/workflows/`：CI、自动修复与发布流程。

## 构建、测试与开发命令
- `pnpm install --frozen-lockfile`：按锁文件精确安装依赖。
- `pnpm dev`：启动本地开发服务（`http://localhost:3040`）。
- `pnpm lint`：运行 Biome 代码检查。
- `pnpm check`：运行 Biome 的 lint + format 校验。
- `pnpm check:fix`：自动修复可修复的格式与 lint 问题。
- `pnpm build`：生成生产构建，并准备 `.next/standalone` 运行目录。
- `pnpm start`：启动生产模式服务。
- Docker 快速启动：在 `docker/` 目录执行 `docker compose up -d`（先准备 `docker/.env`）。

## 代码风格与命名规范
- 技术栈为 TypeScript + React，`tsconfig.json` 已启用 `strict`。
- 使用 Biome 统一格式与静态检查（见 `biome.json`）：
  - 2 空格缩进，行宽 100。
  - 双引号，尾随逗号 `all`，分号 `asNeeded`。
  - Tailwind 类名需排序（`useSortedClasses`）。
- 命名建议：
  - React 组件文件使用 `PascalCase`（如 `ServerCard.tsx`）。
  - API 路由文件统一为 `route.ts`。
  - `lib/` 下工具模块按领域命名，保持简洁清晰。

## 测试指南
- 当前 `package.json` 未提供独立单元/集成测试脚本。
- 现有质量门禁与 CI 一致：`pnpm lint` + `pnpm build`。
- 涉及 UI 或数据流改动时，请在 `pnpm dev` 下进行手动冒烟验证，覆盖相关页面与 API。

## 提交与 Pull Request 规范
- 提交信息遵循 Conventional Commits：`feat:`、`fix:`、`chore:`，可加 scope（如 `feat(server-detail): ...`）。
- 单次提交保持聚焦，避免将重构与功能变更混在一起。
- 提交 PR 前请先运行：`pnpm check`、`pnpm build`。
- PR 建议包含：
  - 变更摘要（重点说明行为变化）。
  - 关联 issue（如 `#123`）。
  - UI 变更截图或短录屏。
- 仓库启用了自动修复工作流，可能会向 PR 分支自动推送格式化修复提交。

## 安全与配置提示
- 本地请从 `.env.example` 复制生成 `.env`，不要提交真实密钥。
- `NezhaAuth`、各类服务 Base URL 等应视为敏感信息妥善保管。
