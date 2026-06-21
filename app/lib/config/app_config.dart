import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

class AppConfig {
  const AppConfig({
    required this.brandName,
    required this.homeserverUrl,
    required this.adminBackendUrl,
    required this.registrationEnabled,
    required this.federationEnabled,
    required this.e2eeDefault,
    required this.maxUploadMb,
  });

  final String brandName;
  final String homeserverUrl;
  final String adminBackendUrl;
  final bool registrationEnabled;
  final bool federationEnabled;
  final bool e2eeDefault;
  final int maxUploadMb;

  AppConfig copyWith({
    String? brandName,
    String? homeserverUrl,
    String? adminBackendUrl,
    bool? registrationEnabled,
    bool? federationEnabled,
    bool? e2eeDefault,
    int? maxUploadMb,
  }) {
    return AppConfig(
      brandName: brandName ?? this.brandName,
      homeserverUrl: homeserverUrl ?? this.homeserverUrl,
      adminBackendUrl: adminBackendUrl ?? this.adminBackendUrl,
      registrationEnabled: registrationEnabled ?? this.registrationEnabled,
      federationEnabled: federationEnabled ?? this.federationEnabled,
      e2eeDefault: e2eeDefault ?? this.e2eeDefault,
      maxUploadMb: maxUploadMb ?? this.maxUploadMb,
    );
  }

  factory AppConfig.fromJson(Map<String, dynamic> data) {
    return AppConfig(
      brandName: data['brandName'] as String? ?? 'Private IM',
      homeserverUrl: data['homeserverUrl'] as String? ?? 'http://127.0.0.1:8008',
      adminBackendUrl: data['adminBackendUrl'] as String? ?? 'http://127.0.0.1:4180',
      registrationEnabled: data['registrationEnabled'] as bool? ?? false,
      federationEnabled: data['federationEnabled'] as bool? ?? false,
      e2eeDefault: data['e2eeDefault'] as bool? ?? true,
      maxUploadMb: data['maxUploadMb'] as int? ?? 100,
    );
  }

  static Future<AppConfig> load() async {
    final raw = await rootBundle.loadString('assets/app_config.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final local = AppConfig.fromJson(data);
    try {
      final response = await http.get(Uri.parse('${local.adminBackendUrl}/api/app/config'));
      if (response.statusCode != 200) return local;
      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      final remote = payload['data'] as Map<String, dynamic>;
      return local.copyWith(
        brandName: remote['brandName'] as String?,
        homeserverUrl: remote['homeserverUrl'] as String?,
        registrationEnabled: remote['registrationEnabled'] as bool?,
        federationEnabled: remote['federationEnabled'] as bool?,
        e2eeDefault: remote['e2eeDefault'] as bool?,
        maxUploadMb: remote['maxUploadMb'] as int?,
      );
    } catch (_) {
      return local;
    }
  }
}
