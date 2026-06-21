# Local Web Preview

本地 Web 原型用于先检查产品界面和功能布局，不连接真实 Synapse。

## URLs

- 总入口：`http://127.0.0.1:4173/preview.html`
- App 预览：`http://127.0.0.1:4173/app-preview/`
- 后台预览：`http://127.0.0.1:4173/admin/web/`
- Admin Backend：`http://127.0.0.1:4180/api/health`

## Run Locally

静态预览：

```bash
python3 -m http.server 4173
```

Admin Backend：

```bash
node admin/backend/server.mjs
```

一键启动本地 Demo：

```bash
chmod +x scripts/dev-local.sh
./scripts/dev-local.sh
```

如果系统没有 `node` 或 `python3`，可以指定运行时：

```bash
NODE_BIN=/path/to/node PYTHON_BIN=/path/to/python3 ./scripts/dev-local.sh
```

真实 Synapse 模式：

```bash
ADMIN_BACKEND_MODE=synapse \
SYNAPSE_ADMIN_API_BASE_URL=http://127.0.0.1:8008 \
SYNAPSE_ADMIN_TOKEN=your-admin-access-token \
node admin/backend/server.mjs
```

本地回归检查：

```bash
node scripts/smoke-test.mjs
```

该脚本会临时创建测试用户、注册码和会话，验证后台与 App API 的核心链路，结束后自动清理测试数据。

## Scope

- `app-preview/`：聊天客户端预览，包含会话、聊天、群资料、共享文件、安全状态、设置页。
- `admin/web/`：后台管理预览，包含用户、群聊、文件、举报、系统通知、注册管理、系统维护。

## Interactive Demo

App 预览已支持：

- 本地登录：`alice / demo123`
- 从 Admin Backend 加载会话列表
- 会话置顶、免打扰、归档和归档恢复
- 通过通讯录新建单聊会话
- 通过通讯录多选联系人创建群聊
- 从 Admin Backend 加载消息
- 当前会话消息搜索
- 自己发送的消息编辑和撤回
- 对方消息举报并进入后台举报审核
- 会话详情：成员、文件、安全状态、退出会话
- 群聊成员邀请和移除
- 会话切换
- 单聊/群聊筛选
- 会话搜索
- 通过 Admin Backend 发送消息
- 通过 Admin Backend 发送附件，并同步到后台媒体列表
- 使用邀请码注册新账号
- 通讯录列表
- 通讯录搜索
- 文件列表视图和文件搜索
- 设置页：账号、设备、安全策略、服务器和上传上限
- 设置页个人资料编辑：昵称和状态
- 设置页修改登录密码
- 设置页设备列表和设备移除
- 设置页通知偏好：消息通知、免打扰、通知预览
- 从 Admin Backend 读取品牌和安全配置
- 退出登录
- 刷新客户端配置
- 顶部按钮和左侧导航提示

后台预览已支持：

- 本地登录：`admin / admin123`
- 角色登录：`operator / ops123`、`auditor / audit123`
- 后台 RBAC：审计员只读，owner/admin 可写
- 左侧菜单激活状态
- 用户搜索
- 新建用户弹窗
- 通过 Admin Backend 创建用户
- 通过 Admin Backend 禁用/解封用户
- 通过 Admin Backend 修改密码、设置管理员、强制下线、注销用户
- 通过 Admin Backend 解散群聊、隔离媒体、删除媒体、处理举报
- 通过 Admin Backend 查询公开房间、设置群管理员
- 通过 Admin Backend 按用户/房间筛选媒体、批量隔离媒体、清理已隔离媒体
- 通过 Admin Backend 查看举报详情，并从举报联动封禁用户、隔离媒体、解散群聊
- 通过 Admin Backend 给单个或多个用户发送系统通知
- 客户端配置读写：品牌、Homeserver、上传上限、E2EE、注册、联邦
- 邀请码/注册码创建、启用、禁用和使用次数统计
- 邀请码/注册码删除
- 用户/群聊/媒体/举报操作弹窗
- 系统通知发送提示
- 操作日志弹窗
- 操作日志关键词筛选
- 从本地 Admin Backend 加载用户、群聊、媒体、举报数据
- 通过本地 Admin Backend 模拟发送系统通知
- 运行统计和系统状态
- 运行配置检查：端口、Mock 数据路径、Synapse 地址、Admin API 暴露策略
- 本地存储状态：Mock 数据文件大小、更新时间和维护建议
- 后台认证状态：最后登录、失败次数、锁定账号和过期锁定清理
- 后台健康自检：API、持久化、基础数据、举报队列、认证锁定和运行配置
- 审计日志导出
- 本地 Mock 数据备份导出
- 本地 Mock 数据备份导入
- 房间历史消息清理和清理任务状态
- Demo 数据重置

## Notes

- 当前是本地 API 驱动 Demo。
- 已包含本地 Demo 登录，不是生产认证。
- 当前 Admin Backend 使用 JSON 文件模拟数据库和 Synapse Admin API。
- 已预留 Synapse adapter，可以通过 `ADMIN_BACKEND_MODE=synapse` 切到真实调用。
- 当前接口覆盖清单见 `admin/src/api-coverage.md`。
- 每轮开发后建议运行 `node scripts/smoke-test.mjs` 做基础回归。
- 下一步可以把后台迁移成 React/Next.js，并接入后台服务。
