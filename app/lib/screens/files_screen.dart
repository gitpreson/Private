import 'package:flutter/material.dart';

import '../config/app_config.dart';

class FilesScreen extends StatelessWidget {
  const FilesScreen({required this.config, super.key});

  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('文件')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.folder_open, size: 52),
              const SizedBox(height: 12),
              const Text('文件列表待接入 Matrix media API'),
              const SizedBox(height: 6),
              Text('上传上限 ${config.maxUploadMb} MB'),
            ],
          ),
        ),
      ),
    );
  }
}
