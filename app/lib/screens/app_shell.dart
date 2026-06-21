import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../services/matrix_service.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({
    required this.config,
    required this.matrix,
    super.key,
  });

  final AppConfig config;
  final MatrixService matrix;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late AppConfig _config;
  late bool _loggedIn;

  @override
  void initState() {
    super.initState();
    _config = widget.config;
    _loggedIn = widget.matrix.isLoggedIn;
  }

  void _setConfig(AppConfig value) {
    widget.matrix.updateConfig(value);
    setState(() => _config = value);
  }

  void _setLoggedIn(bool value) {
    setState(() => _loggedIn = value);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loggedIn) {
      return LoginScreen(
        config: _config,
        matrix: widget.matrix,
        onConfigChanged: _setConfig,
        onLoggedIn: () => _setLoggedIn(true),
      );
    }
    return HomeScreen(
      config: _config,
      matrix: widget.matrix,
      onLoggedOut: () => _setLoggedIn(false),
    );
  }
}
