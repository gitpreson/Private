import 'package:flutter/material.dart';

class CommunitiesScreen extends StatefulWidget {
  const CommunitiesScreen({super.key});

  @override
  State<CommunitiesScreen> createState() => _CommunitiesScreenState();
}

class _CommunitiesScreenState extends State<CommunitiesScreen> {
  final _searchController = TextEditingController();
  final Set<String> _joined = {'产品安全群'};

  final List<_Community> _communities = const [
    _Community(name: '产品安全群', category: '安全', members: 128, description: '端到端加密、风控和产品安全讨论。'),
    _Community(name: '运维值班', category: '运维', members: 36, description: '服务状态、媒体清理和发布排期。'),
    _Community(name: '新项目群', category: '项目', members: 12, description: '新功能评审、测试验收和版本沟通。'),
    _Community(name: '公告通知', category: '公告', members: 560, description: '系统公告、服务条款和安全提醒。'),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final keyword = _searchController.text.trim().toLowerCase();
    final visible = _communities.where((item) {
      if (keyword.isEmpty) return true;
      return '${item.name} ${item.category} ${item.description}'.toLowerCase().contains(keyword);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: SearchBar(
            controller: _searchController,
            hintText: '搜索社群',
            leading: const Icon(Icons.search),
            onChanged: (_) => setState(() {}),
          ),
        ),
        Expanded(
          child: visible.isEmpty
              ? const Center(child: Text('没有找到相关社群'))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: visible.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final community = visible[index];
                    final joined = _joined.contains(community.name);
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Text(community.name.characters.first)),
                        title: Text(community.name),
                        subtitle: Text('${community.category} · ${community.members} 位成员\n${community.description}'),
                        isThreeLine: true,
                        trailing: FilledButton.tonal(
                          onPressed: () {
                            setState(() {
                              if (joined) {
                                _joined.remove(community.name);
                              } else {
                                _joined.add(community.name);
                              }
                            });
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(joined ? '已退出 ${community.name}' : '已加入 ${community.name}')),
                            );
                          },
                          child: Text(joined ? '退出' : '加入'),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _Community {
  const _Community({
    required this.name,
    required this.category,
    required this.members,
    required this.description,
  });

  final String name;
  final String category;
  final int members;
  final String description;
}
