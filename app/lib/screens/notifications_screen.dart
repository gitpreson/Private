import 'package:flutter/material.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<_Notice> _notices = [
    const _Notice(title: '系统通知', body: '端到端加密已为新房间默认开启。', unread: true),
    const _Notice(title: '社群公告', body: '产品安全群发布了新的测试验收要求。', unread: true),
    const _Notice(title: '私信通知', body: 'Linda Chen 给你发送了一条消息。', unread: false),
  ];

  int get _unreadCount => _notices.where((item) => item.unread).length;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          title: Text('未读通知 $_unreadCount 条'),
          trailing: TextButton(
            onPressed: _unreadCount == 0
                ? null
                : () {
                    setState(() {
                      for (var i = 0; i < _notices.length; i += 1) {
                        _notices[i] = _notices[i].copyWith(unread: false);
                      }
                    });
                  },
            child: const Text('全部已读'),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.separated(
            itemCount: _notices.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final notice = _notices[index];
              return ListTile(
                leading: Icon(notice.unread ? Icons.notifications_active : Icons.notifications_none),
                title: Text(notice.title),
                subtitle: Text(notice.body),
                trailing: notice.unread ? const Badge(label: Text('新')) : null,
                onTap: () => setState(() => _notices[index] = notice.copyWith(unread: false)),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _Notice {
  const _Notice({
    required this.title,
    required this.body,
    required this.unread,
  });

  final String title;
  final String body;
  final bool unread;

  _Notice copyWith({bool? unread}) => _Notice(
        title: title,
        body: body,
        unread: unread ?? this.unread,
      );
}
