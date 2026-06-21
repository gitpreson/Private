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
  late bool _loggedIn;

  @override
  void initState() {
    super.initState();
    _loggedIn = widget.matrix.isLoggedIn;
  }

  void _setLoggedIn(bool value) {
    setState(() => _loggedIn = value);
  }

  @override
  Widget build(BuildContext context) {
    if (!_loggedIn) {
      return LoginScreen(
        config: widget.config,
        matrix: widget.matrix,
        onLoggedIn: () => _setLoggedIn(true),
      );
    }
    return HomeScreen(
      config: widget.config,
      matrix: widget.matrix,
      onLoggedOut: () => _setLoggedIn(false),
    );
  }
}
