import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/matrix_service.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.config,
    required this.matrix,
    required this.onConfigChanged,
    required this.onLoggedIn,
    super.key,
  });

  final AppConfig config;
  final MatrixService matrix;
  final ValueChanged<AppConfig> onConfigChanged;
  final VoidCallback onLoggedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController(text: 'alice');
  final _password = TextEditingController();
  late final TextEditingController _homeserver;
  late final TextEditingController _adminBackend;
  bool _loading = false;
  bool _showServerSettings = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _homeserver = TextEditingController(text: widget.config.homeserverUrl);
    _adminBackend = TextEditingController(text: widget.config.adminBackendUrl);
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    _homeserver.dispose();
    _adminBackend.dispose();
    super.dispose();
  }

  String? _validateUrl(String value, String label) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      return '$label 需要填写完整地址，例如 https://im.example.com';
    }
    if (uri.host == '127.0.0.1' || uri.host == 'localhost') {
      return '手机 APK 不能使用 $uri，请填写公网域名或局域网 IP';
    }
    return null;
  }

  Future<void> _saveServerSettings() async {
    final homeserverError = _validateUrl(_homeserver.text, 'Homeserver');
    final adminBackendError = _validateUrl(_adminBackend.text, 'Admin Backend');
    if (homeserverError != null || adminBackendError != null) {
      setState(() => _error = homeserverError ?? adminBackendError);
      return;
    }
    final nextConfig = widget.matrix.config.copyWith(
      homeserverUrl: _homeserver.text.trim(),
      adminBackendUrl: _adminBackend.text.trim(),
    );
    await widget.matrix.saveConfig(nextConfig);
    widget.onConfigChanged(nextConfig);
    setState(() {
      _error = null;
      _showServerSettings = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('服务器地址已更新')),
    );
  }

  Future<void> _login() async {
    if (_username.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = '请输入账号和密码');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.matrix.login(
        username: _username.text.trim(),
        password: _password.text,
      );
      widget.onLoggedIn();
    } catch (error) {
      final message = error.toString();
      final serverHint = widget.matrix.config.homeserverUrl.contains('127.0.0.1') || widget.matrix.config.homeserverUrl.contains('localhost')
          ? '当前服务器是本机地址，手机无法访问。请改成公网域名或局域网 IP。'
          : '请确认服务器地址可访问，并且账号已在 Synapse 中创建。';
      setState(() => _error = '登录失败。\n$serverHint\n$message');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    CircleAvatar(
                      radius: 34,
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      child: const Text('PX', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(height: 24),
                    Text(widget.config.brandName, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 6),
                    Text(widget.matrix.config.homeserverUrl, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.dns_outlined),
                                const SizedBox(width: 8),
                                const Expanded(child: Text('服务器设置')),
                                TextButton(
                                  onPressed: () => setState(() => _showServerSettings = !_showServerSettings),
                                  child: Text(_showServerSettings ? '收起' : '修改'),
                                ),
                              ],
                            ),
                            Text(
                              '手机安装 APK 后不能连接 127.0.0.1，请填写公网域名或同 WiFi 下电脑 IP。',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            if (_showServerSettings) ...[
                              const SizedBox(height: 12),
                              TextField(
                                controller: _homeserver,
                                decoration: const InputDecoration(labelText: 'Homeserver URL'),
                                keyboardType: TextInputType.url,
                              ),
                              const SizedBox(height: 10),
                              TextField(
                                controller: _adminBackend,
                                decoration: const InputDecoration(labelText: 'Admin Backend URL'),
                                keyboardType: TextInputType.url,
                              ),
                              const SizedBox(height: 12),
                              FilledButton.tonal(
                                onPressed: _saveServerSettings,
                                child: const Text('保存服务器地址'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    TextField(
                      controller: _username,
                      decoration: const InputDecoration(labelText: '账号'),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      decoration: const InputDecoration(labelText: '密码'),
                      obscureText: true,
                      onSubmitted: (_) => _login(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      SelectableText(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _loading ? null : _login,
                      child: Text(_loading ? '登录中' : '登录'),
                    ),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: widget.config.registrationEnabled
                          ? () => Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => RegisterScreen(config: widget.config)),
                              )
                          : null,
                      child: Text(widget.config.registrationEnabled ? '使用邀请码注册' : '注册入口已关闭'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
