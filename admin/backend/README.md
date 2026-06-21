# Admin Backend

本地 Admin Backend 用于把后台 Web 从静态 Demo 推进到 API 驱动 Demo。

当前实现：

- 零依赖 Node.js 服务
- `mock` 模式：JSON 文件持久化模拟数据
- `synapse` 模式：调用真实 Synapse Admin API
- 接口形状对齐后台 API 合同
- 响应里包含对应 Synapse Admin API 映射

## Run

Mock 模式：

```bash
ADMIN_BACKEND_PORT=4180 node admin/backend/server.mjs
```

Synapse 模式：

```bash
ADMIN_BACKEND_MODE=synapse \
SYNAPSE_ADMIN_API_BASE_URL=http://127.0.0.1:8008 \
SYNAPSE_ADMIN_TOKEN=your-admin-access-token \
node admin/backend/server.mjs
```

本地健康检查：

```bash
curl http://127.0.0.1:4180/api/health
```

基础回归检查：

```bash
node scripts/smoke-test.mjs
```

覆盖健康检查、后台登录、审计员只读限制、用户生命周期、注册码、App 注册、会话消息、公告、审计日志、本地存储状态和后台健康自检。
同时覆盖本地 Mock 数据备份导出/导入，用于确认开发数据可恢复。

## API

当前接口覆盖清单见 `admin/src/api-coverage.md`。

## Production Database

生产环境后台自有数据建议落到 Admin DB：

```text
admin/db/schema.sql
```

包括管理员账号、后台 session、审计日志、App 配置、注册码和运维任务。当前零依赖 Node 服务仍用于本地 Demo 和接口验证；生产迁移路径见 `admin/db/README.md`。

## Demo Roles

| 账号 | 密码 | 角色 | 权限 |
| --- | --- | --- | --- |
| `admin` | `admin123` | owner | 全部后台能力 |
| `operator` | `ops123` | admin | 日常运营写操作 |
| `auditor` | `audit123` | auditor | 只读查看和审计导出 |

这些账号可以通过环境变量覆盖：

```bash
ADMIN_OWNER_USERNAME=admin \
ADMIN_OWNER_PASSWORD=change-this-password \
ADMIN_OWNER_TOKEN=change-this-token \
ADMIN_OPERATOR_USERNAME=operator \
ADMIN_OPERATOR_PASSWORD=change-this-password \
ADMIN_OPERATOR_TOKEN=change-this-token \
ADMIN_AUDITOR_USERNAME=auditor \
ADMIN_AUDITOR_PASSWORD=change-this-password \
ADMIN_AUDITOR_TOKEN=change-this-token \
node admin/backend/server.mjs
```

生产部署前必须替换默认密码和 Token。后台“系统维护”的运行配置和健康自检会提示是否仍在使用 Demo 凭据。

App Preview 的默认访问 Token 也可以覆盖：

```bash
APP_DEMO_TOKEN=change-this-app-token node admin/backend/server.mjs
```

## Adapters

- `adapters/mock.mjs`：本地演示数据。
- `adapters/synapse.mjs`：真实 Synapse Admin API 调用。
- `adapters/index.mjs`：根据 `ADMIN_BACKEND_MODE` 选择 adapter。

## Next

下一步把 Synapse 跑起来，并用真实管理员 token 验证 `synapse` 模式：

```text
Admin Web -> Admin Backend -> Synapse Admin API
```
