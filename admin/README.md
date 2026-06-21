# Admin Console

管理后台是业务控制层，不替代 Synapse。它负责把 Synapse Admin API、企业配置、运营规则包装成产品可用的后台。

## Recommended Stack

- Next.js 或 Vite React
- TypeScript
- PostgreSQL 保存后台自有配置
- Synapse Admin API 管理 Matrix 用户和房间

当前仓库已提供生产化 Admin DB schema：

```text
admin/db/schema.sql
```

离线检查：

```bash
node scripts/admin-production-check.mjs
```

## Core Rule

运营人员只操作管理后台。后台服务调用 Synapse Admin API，管理员 Token 只保存在后台服务端。

生产环境不要把 `/_synapse/admin/*` 暴露到公网，只允许后台服务通过内网访问。

## MVP Modules

| 模块 | 功能 |
| --- | --- |
| 用户管理 | 用户列表、详情、创建、改密、禁用、解封、设备、踢下线 |
| 群聊管理 | 群列表、详情、成员、状态、设置管理员、解散群 |
| 文件管理 | 用户文件、群文件、隔离违规媒体、删除媒体、存储清理 |
| 举报审核 | 举报列表、消息详情、处理状态、封禁、解散群、隔离媒体 |
| 系统通知 | 单用户通知、批量通知、服务条款提醒、风控提醒 |

## Backlog Modules

| 模块 | 功能 |
| --- | --- |
| 注册管理 | 注册码、邀请码、注册开关、注册限制 |
| 系统维护 | 数据清理、媒体清理、服务状态 |
| Dashboard | 在线用户、日活、消息量、存储用量、告警 |
| App Config | 客户端功能开关、默认服务器、下载地址、品牌信息 |
| Security | 管理员角色、操作日志、IP 白名单、登录二次验证 |

## Permission Model

- `owner`：系统所有者，可管理所有配置。
- `admin`：日常运营管理员，可管理用户、群、公告。
- `auditor`：只读审计角色，可查看日志和导出记录。
- `support`：客服角色，可查看用户状态和处理封禁申诉。

## API Boundary

后台服务应该只暴露自己的业务 API，前端不直接持有 Synapse 管理员 Token。

```text
Admin Web -> Admin Backend -> Synapse Admin API
                       -> Admin DB
```

本地开发：

```text
Admin Backend -> http://synapse:8008/_synapse/admin/...
Developer     -> http://localhost:8008
```

生产环境：

```text
Public Internet -> App/API public routes only
Internal Network -> /_synapse/admin/* only for Admin Backend
```

## Menu

```text
后台管理系统
├── 用户管理
│   ├── 用户列表
│   ├── 用户详情
│   ├── 禁用/解封
│   ├── 修改密码
│   ├── 设备管理
│   └── 用户房间
├── 群聊管理
│   ├── 群列表
│   ├── 群详情
│   ├── 群成员
│   ├── 群状态
│   ├── 设置管理员
│   └── 解散群
├── 文件管理
│   ├── 文件列表
│   ├── 用户文件
│   ├── 群文件
│   ├── 隔离文件
│   └── 删除文件
├── 举报审核
│   ├── 举报列表
│   ├── 消息详情
│   ├── 处理记录
│   └── 封禁处理
├── 系统通知
│   ├── 单用户通知
│   └── 批量通知
├── 注册管理
│   ├── 注册码
│   ├── 邀请码
│   └── 注册限制
└── 系统维护
    ├── 数据清理
    ├── 媒体清理
    └── 服务状态
```

## First Milestone

1. 登录后台。
2. 用户管理。
3. 群聊管理。
4. 文件/媒体管理。
5. 举报审核。
6. 系统通知。
