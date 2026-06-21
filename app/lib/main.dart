import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'screens/app_shell.dart';
import 'services/matrix_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final config = await AppConfig.load();
  final matrix = MatrixService(config);
  await matrix.restoreSession();
  runApp(PrivateImApp(config: config, matrix: matrix));
}

class PrivateImApp extends StatelessWidget {
  const PrivateImApp({
    required this.config,
    required this.matrix,
    super.key,
  });

  final AppConfig config;
  final MatrixService matrix;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: config.brandName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0f9f8f)),
        useMaterial3: true,
      ),
      home: AppShell(config: config, matrix: matrix),
    );
  }
}
