# Admin API Contract

第一阶段后台 API 设计，后续实现时保持接口稳定。当前已实现接口清单以 `admin/src/api-coverage.md` 为准。

后台 API 是产品接口；Synapse Admin API 是内部依赖。前端不直接调用 `/_synapse/admin/*`。

当前 Admin Backend 支持两种模式：

- `mock`：JSON 文件持久化数据，用于本地演示。
- `synapse`：通过 `SYNAPSE_ADMIN_API_BASE_URL` 和 `SYNAPSE_ADMIN_TOKEN` 调用真实 Synapse Admin API。

## Auth

### POST /api/admin/login

Request:

```json
{
  "username": "admin",
  "password": "password"
}
```

Response:

```json
{
  "token": "jwt",
  "role": "owner",
  "username": "admin"
}
```

### GET /api/admin/me

返回当前后台会话、角色、写权限、最近登录时间和认证锁定状态。

```json
{
  "username": "admin",
  "role": "owner",
  "canWrite": true,
  "lastLoginAt": "2026-06-16T00:00:00.000Z",
  "failedLoginCount": 0,
  "lockedUntil": null,
  "permissions": ["read:admin", "write:operations", "export:audit"]
}
```

## Users

### GET /api/admin/users

Query:

- `keyword`
- `status`
- `page`
- `pageSize`

### POST /api/admin/users

```json
{
  "username": "alice",
  "displayName": "Alice",
  "password": "temporary-password"
}
```

### PATCH /api/admin/users/:userId/status

```json
{
  "disabled": true,
  "reason": "policy violation"
}
```

### GET /api/admin/users/:userId

内部映射：

```text
GET /_synapse/admin/v2/users/{user_id}
```

### PATCH /api/admin/users/:userId/password

内部映射：

```text
PUT /_synapse/admin/v2/users/{user_id}
```

### DELETE /api/admin/users/:userId

内部映射：

```text
POST /_synapse/admin/v1/deactivate/{user_id}
```

### POST /api/admin/users/:userId/logout

内部映射：

```text
GET /_synapse/admin/v1/whois/{user_id}
```

### GET /api/admin/users/:userId/devices

内部映射：

```text
GET /_synapse/admin/v2/users/{user_id}/devices
```

## Rooms

### GET /api/admin/rooms

### GET /api/admin/rooms/:roomId

### GET /api/admin/rooms/:roomId/members

内部映射：

```text
GET /_synapse/admin/v1/rooms/{room_id}/members
```

### GET /api/admin/rooms/:roomId/state

内部映射：

```text
GET /_synapse/admin/v1/rooms/{room_id}/state
```

### POST /api/admin/rooms/:roomId/close

内部映射：

```text
DELETE /_synapse/admin/v1/rooms/{room_id}
```

### POST /api/admin/rooms/:roomId/make-admin

内部映射：

```text
POST /_synapse/admin/v1/rooms/{room_id}/make_room_admin
```

### POST /api/admin/rooms/:roomId/notice

```json
{
  "content": "系统将于今晚 23:00 维护。"
}
```

## Media

### GET /api/admin/media

内部映射：

```text
GET /_synapse/admin/v1/room/{room_id}/media
```

### POST /api/admin/rooms/:roomId/media/quarantine

内部映射：

```text
POST /_synapse/admin/v1/room/{room_id}/media/quarantine
```

### POST /api/admin/users/:userId/media/quarantine

内部映射：

```text
POST /_synapse/admin/v1/user/{user_id}/media/quarantine
```

### DELETE /api/admin/media/:mediaId

内部映射：

```text
DELETE /_synapse/admin/v1/media/{server_name}/{media_id}
```

## Reports

### GET /api/admin/reports

内部映射：

```text
GET /_synapse/admin/v1/event_reports
```

### GET /api/admin/reports/:reportId

内部映射：

```text
GET /_synapse/admin/v1/event_reports/{report_id}
```

### POST /api/admin/reports/:reportId/resolve

内部映射：

```text
DELETE /_synapse/admin/v1/event_reports/{report_id}
```

### POST /api/admin/reports/bulk-handle

请求：

```json
{
  "reportIds": ["rpt-1001"],
  "actions": ["resolve", "ban-user", "quarantine-media", "quarantine-user-media"]
}
```

说明：

- `reportIds` 为空时处理当前所有待处理举报。
- `actions` 至少包含 `resolve`；可联动封禁用户、隔离媒体、隔离用户媒体或解散群聊。
- 后台会写入审计日志，运营人员不直接调用 Synapse Admin API。

## Notices

### POST /api/admin/notices

```json
{
  "userId": "@alice:localhost",
  "content": "系统将于今晚 23:00 维护。"
}
```

### POST /api/admin/notices/bulk

```json
{
  "userIds": ["@alice:localhost", "@ops:localhost"],
  "content": "系统将于今晚 23:00 维护。"
}
```

## Runtime

### GET /api/admin/runtime-config

返回后端运行模式、端口、Mock 数据路径、Synapse 地址和基础配置检查结果。

### GET /api/admin/storage-status

返回本地 Mock 数据文件路径、大小、更新时间和维护建议。

### GET /api/admin/auth-status

返回后台认证状态文件、记录账号数、锁定账号数、失败登录次数和账号级认证状态。

### POST /api/admin/auth-status/cleanup

清理已经过期的后台账号锁定状态。需要 `owner/admin` 权限。

### GET /api/admin/self-check

聚合 API、存储、基础数据、举报队列、后台认证锁定和运行配置检查结果。

## Registration

第二阶段实现。

```text
POST /_synapse/admin/v1/register
GET /_synapse/admin/v1/registration_tokens
POST /_synapse/admin/v1/registration_tokens/new
DELETE /_synapse/admin/v1/registration_tokens/{token}
```

## Maintenance

第二阶段实现。

```text
POST /_synapse/admin/v1/purge_history/{room_id}
GET /_synapse/admin/v1/purge_history_status/{purge_id}
DELETE /_synapse/admin/v1/rooms/{room_id}
```

## App Config

### GET /api/admin/app-config

### PUT /api/admin/app-config

```json
{
  "brandName": "Private IM",
  "homeserverUrl": "http://localhost:8008",
  "registrationEnabled": false,
  "fileUploadMaxMb": 100,
  "e2eeDefault": true
}
```
