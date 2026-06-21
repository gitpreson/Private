import 'package:flutter/material.dart';
import 'package:matrix/matrix.dart';

import '../config/app_config.dart';
import '../services/matrix_service.dart';
import 'chat_screen.dart';
import 'communities_screen.dart';
import 'files_screen.dart';
import 'notifications_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    required this.config,
    required this.matrix,
    required this.onLoggedOut,
    super.key,
  });

  final AppConfig config;
  final MatrixService matrix;
  final VoidCallback onLoggedOut;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  late Future<List<Room>> _rooms;

  @override
  void initState() {
    super.initState();
    _rooms = widget.matrix.rooms();
  }

  Future<void> _refresh() async {
    setState(() => _rooms = widget.matrix.rooms());
    await _rooms;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.config.brandName),
        actions: [
          IconButton(
            tooltip: '刷新',
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
        ],
      ),
      body: switch (_tab) {
        0 => FutureBuilder<List<Room>>(
              future: _rooms,
              builder: (context, snapshot) {
                final rooms = snapshot.data ?? [];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (rooms.isEmpty) {
                  return const Center(child: Text('暂无会话'));
                }
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.separated(
                    itemCount: rooms.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final room = rooms[index];
                      final name = room.getLocalizedDisplayName();
                      return ListTile(
                        leading: CircleAvatar(child: Text((name.isNotEmpty ? name : '#')[0].toUpperCase())),
                        title: Text(name),
                        subtitle: Text(room.lastEvent?.text ?? 'Matrix room'),
                        trailing: room.notificationCount > 0 ? Badge(label: Text('${room.notificationCount}')) : null,
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => ChatScreen(matrix: widget.matrix, room: room)),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
        1 => const CommunitiesScreen(),
        2 => FilesScreen(config: widget.config),
        3 => const NotificationsScreen(),
        _ => SettingsScreen(
            config: widget.config,
            matrix: widget.matrix,
            onLoggedOut: widget.onLoggedOut,
          ),
      },
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (value) => setState(() => _tab = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: '消息'),
          NavigationDestination(icon: Icon(Icons.groups_outlined), selectedIcon: Icon(Icons.groups), label: '社群'),
          NavigationDestination(icon: Icon(Icons.folder_outlined), selectedIcon: Icon(Icons.folder), label: '文件'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: '通知'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: '设置'),
        ],
      ),
    );
  }
}
