# Admin Backend API Coverage

当前文件记录本地 Admin Backend 已实现的接口覆盖，用于从 Mock Demo 迁移到真实 Synapse 时逐项验收。

## Public

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 后端健康检查 |
| POST | `/api/admin/login` | 后台登录 |
| POST | `/api/app/login` | App 登录 |
| POST | `/api/app/register` | App 邀请码注册 |

## App API

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/api/app/me` | 当前用户 |
| PUT | `/api/app/me` | 更新当前用户资料 |
| PUT | `/api/app/me/password` | 修改当前用户密码 |
| GET | `/api/app/config` | 客户端配置 |
| GET | `/api/app/preferences` | 通知偏好 |
| PUT | `/api/app/preferences` | 更新通知偏好 |
| GET | `/api/app/conversations` | 会话列表，支持 `?archived=true` 查看归档 |
| POST | `/api/app/conversations` | 创建单聊会话 |
| PATCH | `/api/app/conversations/:roomId` | 置顶/免打扰/归档会话 |
| POST | `/api/app/group-conversations` | 创建群聊会话 |
| GET | `/api/app/contacts` | 通讯录 |
| GET | `/api/app/files` | 文件列表 |
| GET | `/api/app/devices` | 当前用户设备列表 |
| DELETE | `/api/app/devices/:deviceId` | 移除当前用户设备 |
| GET | `/api/app/rooms/:roomId` | 会话详情 |
| POST | `/api/app/rooms/:roomId/leave` | 退出会话 |
| POST | `/api/app/rooms/:roomId/members` | 邀请群成员 |
| DELETE | `/api/app/rooms/:roomId/members/:userId` | 移除群成员 |
| GET | `/api/app/rooms/:roomId/messages` | 消息列表 |
| POST | `/api/app/rooms/:roomId/messages` | 发送消息 |
| PATCH | `/api/app/rooms/:roomId/messages/:messageId` | 编辑消息 |
| DELETE | `/api/app/rooms/:roomId/messages/:messageId` | 撤回消息 |
| POST | `/api/app/rooms/:roomId/messages/:messageId/report` | 举报消息 |
| POST | `/api/app/rooms/:roomId/attachments` | 发送附件 |

## Admin API

| Method | Path | 用途 | Synapse 映射 |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | 用户列表 | `GET /_synapse/admin/v2/users` |
| POST | `/api/admin/users` | 创建用户 | `PUT /_synapse/admin/v2/users/{user_id}` |
| GET | `/api/admin/users/:userId` | 用户详情 | `GET /_synapse/admin/v2/users/{user_id}` |
| GET | `/api/admin/users/:userId/devices` | 用户设备 | `GET /_synapse/admin/v2/users/{user_id}/devices` |
| PATCH | `/api/admin/users/:userId/status` | 禁用/解封 | `PUT /_synapse/admin/v2/users/{user_id}` |
| PATCH | `/api/admin/users/:userId/password` | 修改密码 | `PUT /_synapse/admin/v2/users/{user_id}` |
| PATCH | `/api/admin/users/:userId/admin` | 设置管理员 | `PUT /_synapse/admin/v2/users/{user_id}` |
| POST | `/api/admin/users/:userId/logout` | 强制下线 | 设备/会话管理 |
| DELETE | `/api/admin/users/:userId` | 注销用户 | `POST /_synapse/admin/v1/deactivate/{user_id}` |
| GET | `/api/admin/rooms` | 群聊列表 | `GET /_synapse/admin/v1/rooms` |
| GET | `/api/admin/public-rooms` | 公开房间 | `GET /_matrix/client/v3/publicRooms` |
| GET | `/api/admin/rooms/:roomId` | 群聊详情/成员/状态 | `GET rooms + members + state` |
| POST | `/api/admin/rooms/:roomId/close` | 解散群聊 | `DELETE /_synapse/admin/v1/rooms/{room_id}` |
| POST | `/api/admin/rooms/:roomId/make-admin` | 设置群管理员 | `POST /make_room_admin` |
| GET | `/api/admin/media` | 媒体列表/筛选 | `GET /room/{room_id}/media` |
| POST | `/api/admin/media/:mediaId/quarantine` | 隔离媒体 | `POST /media/quarantine/...` |
| DELETE | `/api/admin/media/:mediaId` | 删除媒体 | `DELETE /media/{server}/{media}` |
| POST | `/api/admin/rooms/:roomId/media/quarantine` | 隔离房间媒体 | `POST /room/{room_id}/media/quarantine` |
| POST | `/api/admin/users/:userId/media/quarantine` | 隔离用户媒体 | `POST /user/{user_id}/media/quarantine` |
| POST | `/api/admin/media/cleanup` | 清理已隔离媒体 | 媒体删除任务 |
| GET | `/api/admin/reports` | 举报列表 | `GET /event_reports` |
| GET | `/api/admin/reports/:reportId` | 举报详情 | `GET /event_reports/{report_id}` |
| POST | `/api/admin/reports/:reportId/handle` | 举报联动处理 | 组合 Admin API |
| POST | `/api/admin/reports/:reportId/resolve` | 标记举报处理 | `DELETE /event_reports/{report_id}` |
| POST | `/api/admin/reports/bulk-handle` | 批量举报联动处理 | 组合 Admin API |
| POST | `/api/admin/notices` | 单用户通知 | `POST /send_server_notice` |
| POST | `/api/admin/notices/bulk` | 批量通知 | 多次 `send_server_notice` |
| GET | `/api/admin/audit-logs` | 审计日志 | 业务后台日志 |
| GET | `/api/admin/me` | 当前后台会话 | 业务后台认证 |
| GET | `/api/admin/stats` | 运行统计 | 聚合数据 |
| GET | `/api/admin/system-status` | 系统状态 | 业务后台状态 |
| GET | `/api/admin/runtime-config` | 运行配置检查 | 业务后台配置 |
| GET | `/api/admin/storage-status` | 本地存储状态 | Mock 运维状态 |
| GET | `/api/admin/auth-status` | 后台认证状态 | 业务后台认证 |
| POST | `/api/admin/auth-status/cleanup` | 清理过期锁定 | 业务后台认证 |
| GET | `/api/admin/self-check` | 后台健康自检 | 聚合运维检查 |
| GET | `/api/admin/backup` | 导出本地 Mock 备份 | Mock only |
| POST | `/api/admin/backup/import` | 导入本地 Mock 备份 | Mock only |
| POST | `/api/admin/reset-demo` | 重置本地 Demo | Mock only |
| POST | `/api/admin/rooms/:roomId/purge-history` | 清理历史消息 | `POST /purge_history/{room_id}` |
| GET | `/api/admin/purge-history/:purgeId` | 清理任务状态 | `GET /purge_history_status/{purge_id}` |
| GET | `/api/admin/app-config` | 读取客户端配置 | 业务配置 |
| PUT | `/api/admin/app-config` | 更新客户端配置 | 业务配置 |
| GET | `/api/admin/registration-tokens` | 注册码列表 | `GET /registration_tokens` |
| POST | `/api/admin/registration-tokens` | 创建注册码 | `POST /registration_tokens/new` |
| PATCH | `/api/admin/registration-tokens/:token/status` | 启用/禁用注册码 | 业务策略 |
| DELETE | `/api/admin/registration-tokens/:token` | 删除注册码 | `DELETE /registration_tokens/{token}` |

## 当前认证边界

- 后台接口需要 Demo 管理 Token：`demo-admin-token`、`demo-operator-token` 或 `demo-auditor-token`。
- `owner/admin` 可以执行写操作；`auditor` 只能执行只读查询和审计导出。
- App 接口需要 `Authorization: Bearer demo-app-token` 或注册后生成的 `demo-app-token-*`。
- `/_synapse/admin/*` 不由前端直接访问，只由 Admin Backend 的 Synapse adapter 访问。

## Demo 账号

| 账号 | 密码 | Token | 角色 |
| --- | --- | --- | --- |
| `admin` | `admin123` | `demo-admin-token` | owner |
| `operator` | `ops123` | `demo-operator-token` | admin |
| `auditor` | `audit123` | `demo-auditor-token` | auditor |
