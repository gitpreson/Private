# SafeX-like Private IM Starter

这是一个基于 Matrix 生态的私有化即时通讯项目骨架，目标是快速落地一个可私有部署、可二开、可扩展到几千到几万人使用的安全 IM 系统。

核心选型：

- IM 服务端：Synapse
- 数据库：PostgreSQL
- 缓存/同步辅助：Redis
- 音视频中继：coturn
- 入口代理：Nginx
- 客户端：Flutter + Matrix SDK 二开
- 管理后台：独立 Admin Web + Synapse Admin API

## 目录

- `server/`：私有化部署配置
- `admin/`：管理后台骨架与接口规划
- `app/`：Flutter 客户端二开说明
- `docs/`：产品、架构、功能说明书
- `outputs/`：给业务/客户看的交付文档

## 第一阶段目标

1. 部署可用的 Matrix 私有服务器。
2. 二开 Flutter 客户端，固定服务器地址并替换品牌 UI。
3. 提供后台管理能力：用户、房间、封禁、公告、基础统计。
4. 保留端到端加密、多端同步、文件消息、群聊等 Matrix 原生能力。

## Local Preview

当前已经包含可点击 Web Demo：

- App 预览：`app-preview/`
- 后台预览：`admin/web/`
- Admin Backend：`admin/backend/`

详见 `docs/preview.md`。

本地一键启动：

```bash
./scripts/dev-local.sh
```

启动后访问：

- 后台：`http://127.0.0.1:4173/admin/web/`
- App：`http://127.0.0.1:4173/app-preview/`
- 后端健康检查：`http://127.0.0.1:4180/api/health`

当前接口覆盖清单：`admin/src/api-coverage.md`。

本地回归检查：

```bash
node scripts/smoke-test.mjs
```

该脚本会检查后台登录、只读权限、用户/注册码/App 注册/App 会话/公告/审计日志等核心链路。运行前需要先启动 Admin Backend。

部署配置检查：

```bash
node scripts/deploy-check.mjs
```

该脚本会检查 `server/` 下的 Docker Compose、Synapse、Nginx、coturn 和后台服务配置骨架。

Flutter App 骨架检查：

```bash
node scripts/app-check.mjs
```

该脚本会检查 `app/` 下的 Flutter 工程文件、Matrix SDK 依赖和核心页面结构。

## APK 自动打包

已提供 GitHub Actions 配置：

```text
.github/workflows/android-apk.yml
```

推送到 `main` / `master` 后会自动构建 Android Release APK，并上传为 GitHub Actions Artifact。服务器自动上传与 App 内更新方案见：

```text
docs/deploy/apk-release.md
```

后台生产化检查：

```bash
node scripts/admin-production-check.mjs
```

该脚本会检查 Admin DB schema、后台账号/session/审计/配置/任务等生产化落点。

真实 Synapse 联调检查：

```bash
node scripts/synapse-smoke.mjs
```

真实 Synapse 服务端模块启动顺序：

```bash
server/scripts/init-local.sh
server/scripts/up-local.sh
server/scripts/create-admin-token.sh
# 将输出的 SYNAPSE_ADMIN_TOKEN 写入 server/.env 后：
server/scripts/run-admin-synapse.sh
node scripts/synapse-smoke.mjs
```

详细步骤见 `server/README.md`。

## 重要说明

本项目不是 safeX 官方源码，也不包含任何逆向或私有代码。它是基于开源 Matrix 技术路线的 clean-room 同类产品实现方案。
