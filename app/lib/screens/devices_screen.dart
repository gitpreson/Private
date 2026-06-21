import 'package:flutter/material.dart';

import '../services/matrix_service.dart';

class DevicesScreen extends StatelessWidget {
  const DevicesScreen({required this.matrix, super.key});

  final MatrixService matrix;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('设备')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.phone_iphone),
            title: Text(matrix.client.deviceID ?? '当前设备'),
            subtitle: const Text('设备列表和删除功能待接 Matrix device API'),
          ),
        ],
      ),
    );
  }
}
