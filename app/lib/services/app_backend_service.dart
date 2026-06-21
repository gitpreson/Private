import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class AppBackendService {
  const AppBackendService(this.config);

  final AppConfig config;

  Future<void> registerWithInvite({
    required String username,
    required String displayName,
    required String inviteCode,
  }) async {
    final response = await http.post(
      Uri.parse('${config.adminBackendUrl}/api/app/register'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'displayName': displayName,
        'inviteCode': inviteCode,
      }),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('registration failed');
    }
  }
}
