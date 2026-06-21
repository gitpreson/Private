import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/matrix_service.dart';
import 'devices_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    required this.config,
    required this.matrix,
    required this.onLoggedOut,
    super.key,
  });

  final AppConfig config;
  final MatrixService matrix;
  final VoidCallback onLoggedOut;

  Future<void> _logout() async {
    await matrix.logout();
    onLoggedOut();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        ListTile(
          leading: const Icon(Icons.person_outline),
          title: Text(matrix.client.userID ?? '未知用户'),
          subtitle: const Text('当前 Matrix 账号'),
        ),
        ListTile(
          leading: const Icon(Icons.devices_outlined),
          title: const Text('设备管理'),
          subtitle: const Text('查看当前设备，后续支持删除设备'),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => DevicesScreen(matrix: matrix)),
          ),
        ),
        ListTile(
          leading: const Icon(Icons.dns_outlined),
          title: Text(config.homeserverUrl),
          subtitle: const Text('Homeserver'),
        ),
        SwitchListTile(
          value: config.e2eeDefault,
          onChanged: null,
          title: const Text('默认端到端加密'),
          subtitle: const Text('由服务端和客户端策略控制'),
        ),
        SwitchListTile(
          value: config.federationEnabled,
          onChanged: null,
          title: const Text('跨服联邦'),
          subtitle: const Text('第一阶段默认关闭'),
        ),
        ListTile(
          leading: const Icon(Icons.upload_file_outlined),
          title: Text('${config.maxUploadMb} MB'),
          subtitle: const Text('文件上传上限'),
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.logout),
          title: const Text('退出登录'),
          onTap: _logout,
        ),
      ],
    );
  }
}
