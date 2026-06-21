# APK 自动打包上线方案

当前项目可以走这条链路：

```text
Codex 本地开发
  -> Git 提交
  -> GitHub Actions 自动构建 APK
  -> 保存 APK Artifact
  -> 可选上传到你的服务器下载目录
```

## 1. 当前状态

本目录当前不是 Git 仓库，`git status` 会返回 `not a git repository`。

需要先把当前目录接到你的 GitHub 仓库：

```bash
git init
git branch -M main
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
git add .
git commit -m "Initial private IM app"
git push -u origin main
```

如果你已经有远程仓库，只需要把 `YOUR_ORG/YOUR_REPO` 换成你的仓库地址。

## 2. 自动构建 APK

已新增：

```text
.github/workflows/android-apk.yml
```

触发方式：

- 推送到 `main` 或 `master`
- 手动点击 GitHub Actions 里的 `Run workflow`

构建产物：

```text
private-im-release-apk/app-release.apk
```

## 3. 自动上传服务器

如果要让用户下载的 APK 自动更新，需要有一个固定下载地址，例如：

```text
https://download.example.com/private-im/app-release.apk
```

在 GitHub 仓库设置里添加：

Variables:

```text
APK_UPLOAD_ENABLED=true
```

Secrets:

```text
APK_SERVER_HOST=服务器 IP
APK_SERVER_USER=SSH 用户
APK_SERVER_SSH_KEY=SSH 私钥
APK_SERVER_PORT=22
APK_SERVER_PATH=/var/www/download/private-im
```

之后每次推送代码，GitHub Actions 会自动把 APK 上传到服务器目录。

## 4. App 内自动更新

APK 自动更新还需要客户端实现版本检查：

```text
App 启动
  -> 请求 /release/android/latest.json
  -> 对比 versionCode
  -> 下载 APK
  -> 调起 Android 安装器
```

注意：非应用商店渠道的自动安装，需要用户授权“允许安装未知来源应用”。正式商业发布建议后续接入应用商店、企业签名或 MDM。
