# Flutter App

这是 Private IM 的 Flutter 真客户端骨架，基于 Matrix Dart SDK，不从零实现 Matrix 协议。

## 当前模块

- 固定 homeserver 配置：`assets/app_config.json`
- 启动时尝试从 Admin Backend 读取 App 配置：`/api/app/config`
- Matrix 登录：`lib/services/matrix_service.dart`
- 邀请码注册入口：`lib/services/app_backend_service.dart`
- 安全保存 token：`flutter_secure_storage`
- 会话列表：读取 Matrix rooms
- 聊天页：展示 timeline，发送文本消息
- 会话详情页：房间 ID、成员数、加密状态
- 文件页：Matrix media API 待接入入口
- 设备页：Matrix device API 待接入入口
- 设置页：显示账号、服务器、E2EE、联邦、上传上限和退出登录

## 本地运行

先启动 Synapse：

```bash
server/scripts/init-local.sh
server/scripts/up-local.sh
server/scripts/create-admin-token.sh
```

用 Synapse 管理员或后台创建 App 用户后运行：

```bash
cd app
flutter pub get
flutter run
```

当前默认 homeserver：

```text
http://127.0.0.1:8008
```

如需修改品牌或服务器地址，编辑：

```text
app/assets/app_config.json
```

## 离线检查

没有 Flutter SDK 的环境可以先跑：

```bash
node scripts/app-check.mjs
```

它会检查工程文件、依赖、配置 JSON、注册服务、核心 Matrix 调用和页面入口是否存在。

## Roadmap

- 图片/文件上传接入 Matrix media API
- 消息编辑/撤回/举报
- 设备列表和设备删除接入 Matrix device API
- E2EE 设备验证和密钥备份
- 推送：FCM/APNs/厂商 Push
- Android/iOS 品牌图标、启动页和隐私协议
