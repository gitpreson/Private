import 'package:flutter/material.dart';
import 'package:matrix/matrix.dart';

import '../services/matrix_service.dart';
import 'room_info_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    required this.matrix,
    required this.room,
    super.key,
  });

  final MatrixService matrix;
  final Room room;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  Timeline? _timeline;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _loadTimeline();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _loadTimeline() async {
    final timeline = await widget.room.getTimeline();
    if (mounted) setState(() => _timeline = timeline);
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入消息内容')),
      );
      return;
    }
    setState(() => _sending = true);
    try {
      await widget.matrix.sendText(widget.room, text);
      _controller.clear();
      await _loadTimeline();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('消息发送失败，请检查网络后重试')),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final events = _timeline?.events ?? [];
    final roomName = widget.room.getLocalizedDisplayName();
    return Scaffold(
      appBar: AppBar(
        title: Text(roomName),
        actions: [
          IconButton(
            tooltip: '会话详情',
            icon: const Icon(Icons.info_outline),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => RoomInfoScreen(room: widget.room)),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: events.isEmpty
                ? const Center(child: Text('暂无消息'))
                : ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.all(12),
                    itemCount: events.length,
                    itemBuilder: (context, index) {
                      final event = events[index];
                      final mine = event.senderId == widget.matrix.client.userID;
                      return Align(
                        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Card(
                          color: mine ? Theme.of(context).colorScheme.primaryContainer : null,
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Text(event.text),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      enabled: !_sending,
                      decoration: const InputDecoration(hintText: '输入消息'),
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sending ? null : _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
