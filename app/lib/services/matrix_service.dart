import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:matrix/matrix.dart';

import '../config/app_config.dart';

class MatrixService {
  MatrixService(this.config) : client = Client(config.brandName);

  final AppConfig config;
  final Client client;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool get isLoggedIn => client.isLogged();

  Future<void> restoreSession() async {
    final homeserver = await _storage.read(key: 'homeserver');
    final accessToken = await _storage.read(key: 'accessToken');
    final userId = await _storage.read(key: 'userId');
    if (homeserver == null || accessToken == null || userId == null) return;
    await client.init(
      newToken: accessToken,
      newUserID: userId,
      newHomeserver: Uri.parse(homeserver),
    );
  }

  Future<void> login({
    required String username,
    required String password,
  }) async {
    await client.checkHomeserver(Uri.parse(config.homeserverUrl));
    await client.login(
      LoginType.mLoginPassword,
      identifier: AuthenticationUserIdentifier(user: username),
      password: password,
      initialDeviceDisplayName: '${config.brandName} Mobile',
    );
    await _storage.write(key: 'homeserver', value: config.homeserverUrl);
    await _storage.write(key: 'accessToken', value: client.accessToken);
    await _storage.write(key: 'userId', value: client.userID);
  }

  Future<void> logout() async {
    if (client.isLogged()) {
      await client.logout();
    }
    await _storage.deleteAll();
  }

  Future<List<Room>> rooms() async {
    if (!client.isLogged()) return [];
    await client.sync();
    return client.rooms;
  }

  Future<void> sendText(Room room, String text) async {
    if (text.trim().isEmpty) return;
    await room.sendTextEvent(text.trim());
  }
}
