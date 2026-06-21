# Server Deployment

## Local Assumptions

- 先使用本地开发环境，不绑定域名。
- Synapse 本地地址为 `http://localhost:8008`。
- TURN 本地地址为 `localhost:3478`。
- 第一阶段关闭公开注册，通过后台或脚本创建用户。

## Bootstrap

1. 初始化本地配置：

```bash
server/scripts/init-local.sh
```

该命令会创建：

- `server/.env`
- `server/synapse/homeserver.yaml`
- `work/runtime/`

2. 检查并修改 `server/.env`。

   `ADMIN_*_PASSWORD` 和 `ADMIN_*_TOKEN` 是后台登录凭据，本地可以使用样例值，生产部署前必须替换。`APP_DEMO_TOKEN` 用于保护当前 Web App Preview 的本地 API，真实 App 接入 Matrix 登录后应替换为客户端登录态。

   `MATRIX_ADMIN_USERNAME` 和 `MATRIX_ADMIN_PASSWORD` 用于创建 Synapse 管理员账号。

3. 启动 Synapse 基础服务：

```bash
server/scripts/up-local.sh
```

4. 创建 Synapse 管理员并获取 access token：

```bash
server/scripts/create-admin-token.sh
```

把脚本打印出来的 `SYNAPSE_ADMIN_TOKEN=...` 写入 `server/.env`。

5. 以真实 Synapse 模式启动 Admin Backend：

```bash
server/scripts/run-admin-synapse.sh
```

6. 运行联调检查：

```bash
node scripts/synapse-smoke.mjs
```

如果需要本地 Nginx 代理：

```bash
cd server
docker compose --profile proxy up -d nginx
```

Compose 组件：

- `postgres`：Synapse 数据库
- `redis`：Synapse 同步辅助
- `synapse`：Matrix homeserver，监听 `8008`
- `admin-backend`：业务后台 API，监听 `4180`
- `coturn`：本地 TURN 中继
- `nginx`：可选代理，使用 `proxy` profile

启动前可先做离线配置检查：

```bash
node scripts/deploy-check.mjs
```

该检查不会拉取镜像，只验证部署文件、环境变量模板、健康检查和本地端口占用。

## Production Notes

- PostgreSQL 必须开启备份。
- Nginx 生产环境需要配置 TLS 证书。
- TURN 服务器建议独立公网机器部署，避免音视频质量受影响。
- 万人规模前需要做 Synapse worker 拆分、媒体服务拆分和数据库调优。
- Synapse Admin API 不应暴露到公网。生产环境需要在反向代理层隐藏 `/_synapse/admin/*`，只允许后台服务从内网访问。

## Admin Backend Modes

本地 Web Demo 默认使用 Mock 模式：

```bash
ADMIN_BACKEND_MODE=mock node admin/backend/server.mjs
```

Mock 数据会持久化到：

```text
work/runtime/mock-db.json
```

切换真实 Synapse 模式时：

```bash
ADMIN_BACKEND_MODE=synapse \
SYNAPSE_ADMIN_API_BASE_URL=http://127.0.0.1:8008 \
SYNAPSE_ADMIN_TOKEN=your-admin-access-token \
node admin/backend/server.mjs
```

运行配置可以在后台“系统维护”中查看，也可以请求：

```bash
curl http://127.0.0.1:4180/api/admin/runtime-config \
  -H 'authorization: Bearer demo-admin-token'
```

## Synapse Integration Check

真实 Synapse 联调最短路径：

1. 初始化配置并启动 Synapse：

```bash
server/scripts/init-local.sh
server/scripts/up-local.sh
```

2. 创建管理员并打印 token：

```bash
server/scripts/create-admin-token.sh
```

3. 将 token 写入 `server/.env` 后启动后台：

```bash
server/scripts/run-admin-synapse.sh
```

4. 运行只读联调检查：

```bash
node scripts/synapse-smoke.mjs
```

可选写入检查会创建并注销一个临时用户：

```bash
SYNAPSE_SMOKE_WRITE=1 node scripts/synapse-smoke.mjs
```

只读检查会覆盖：

- Synapse `/_matrix/client/versions`
- Admin Backend `synapse` 模式
- 后台运行配置、自检、用户、房间、举报、注册码
- App 预览的配置和会话只读接口

如果只读检查通过，说明链路已经是：

```text
Admin Web -> Admin Backend synapse adapter -> Synapse Admin API
```
