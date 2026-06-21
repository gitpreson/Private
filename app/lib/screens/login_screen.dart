import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/matrix_service.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.config,
    required this.matrix,
    required this.onLoggedIn,
    super.key,
  });

  final AppConfig config;
  final MatrixService matrix;
  final VoidCallback onLoggedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController(text: 'alice');
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
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
      setState(() => _error = '登录失败，请检查账号或服务器');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
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
                  Text(widget.config.homeserverUrl, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
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
                    Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
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
    );
  }
}
