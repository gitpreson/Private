import 'package:flutter/material.dart';
import 'package:matrix/matrix.dart';

class RoomInfoScreen extends StatelessWidget {
  const RoomInfoScreen({required this.room, super.key});

  final Room room;

  @override
  Widget build(BuildContext context) {
    final roomName = room.getLocalizedDisplayName();
    return Scaffold(
      appBar: AppBar(title: const Text('会话详情')),
      body: ListView(
        children: [
          ListTile(
            leading: CircleAvatar(child: Text((roomName.isNotEmpty ? roomName : '#')[0].toUpperCase())),
            title: Text(roomName),
            subtitle: Text(room.id),
          ),
          ListTile(
            leading: const Icon(Icons.groups_outlined),
            title: Text('${room.summary.mJoinedMemberCount ?? 0} 位成员'),
            subtitle: const Text('成员管理待接 Matrix invite/kick'),
          ),
          SwitchListTile(
            value: room.encrypted,
            onChanged: null,
            title: const Text('端到端加密'),
          ),
        ],
      ),
    );
  }
}
