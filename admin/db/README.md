# Admin Database

生产环境建议为 Admin Backend 准备独立数据库或独立 schema，用于保存后台自有数据。

Synapse 自己的 Matrix 数据不放在这里：

- 房间事件
- 设备密钥
- Matrix 用户登录态
- 媒体仓库
- 同步状态

Admin DB 保存：

- 后台管理员账号和角色
- 后台 session
- 审计日志
- App 配置
- 注册码/邀请码策略
- 运维任务记录

## Apply Schema

本地 PostgreSQL：

```bash
psql "$ADMIN_DATABASE_URL" -f admin/db/schema.sql
```

Docker Compose 内的 PostgreSQL 可先创建独立库：

```bash
cd server
docker compose exec postgres createdb -U "$POSTGRES_USER" admin_backend
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d admin_backend < ../admin/db/schema.sql
```

## Migration Path From Demo

当前 Demo 状态：

- 管理员账号来自环境变量
- Mock 数据保存在 `work/runtime/mock-db.json`
- 登录失败状态保存在 `work/runtime/auth-state.json`

生产迁移顺序：

1. 应用 `admin/db/schema.sql`
2. 将 `ADMIN_*` 环境变量中的账号写入 `admin_accounts`
3. 用 Argon2/bcrypt 保存 `password_hash`
4. 将审计日志写入 `audit_logs`
5. 将 App 配置写入 `app_config`
6. 将注册码写入 `registration_tokens`
7. Admin Backend 切换到数据库 session/JWT

## Security Notes

- 不要明文保存后台密码。
- 不要在前端保存 Synapse 管理员 token。
- 审计日志建议保留 180 天以上，按合规要求归档。
- `audit_logs.metadata` 可以保存 Synapse endpoint、目标 Matrix ID、处理结果等结构化信息。
