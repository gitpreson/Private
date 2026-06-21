import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/app_backend_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({required this.config, super.key});

  final AppConfig config;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _username = TextEditingController();
  final _displayName = TextEditingController();
  final _inviteCode = TextEditingController();
  bool _loading = false;
  String? _message;

  @override
  void dispose() {
    _username.dispose();
    _displayName.dispose();
    _inviteCode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      await AppBackendService(widget.config).registerWithInvite(
        username: _username.text.trim(),
        displayName: _displayName.text.trim(),
        inviteCode: _inviteCode.text.trim(),
      );
      setState(() => _message = '注册成功，请返回登录');
    } catch (_) {
      setState(() => _message = '注册失败，请检查邀请码');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('邀请码注册')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(controller: _username, decoration: const InputDecoration(labelText: '账号')),
          const SizedBox(height: 12),
          TextField(controller: _displayName, decoration: const InputDecoration(labelText: '显示名称')),
          const SizedBox(height: 12),
          TextField(controller: _inviteCode, decoration: const InputDecoration(labelText: '邀请码')),
          if (_message != null) ...[
            const SizedBox(height: 12),
            Text(_message!),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: Text(_loading ? '提交中' : '注册'),
          ),
        ],
      ),
    );
  }
}
