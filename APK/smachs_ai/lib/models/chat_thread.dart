import 'message.dart';

class ChatThread {
  final String id;
  String title;
  String mode; // general | rag | coanony
  List<ChatMessage> messages;
  final DateTime createdAt;
  DateTime updatedAt;

  ChatThread({
    required this.id,
    required this.title,
    required this.mode,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'mode': mode,
        'messages': messages.map((m) => m.toJson()).toList(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory ChatThread.fromJson(Map<String, dynamic> j) => ChatThread(
        id: j['id'] ?? '',
        title: j['title'] ?? 'New Chat',
        mode: j['mode'] ?? 'general',
        messages: (j['messages'] as List? ?? [])
            .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
            .toList(),
        createdAt: DateTime.tryParse(j['createdAt'] ?? '') ?? DateTime.now(),
        updatedAt: DateTime.tryParse(j['updatedAt'] ?? '') ?? DateTime.now(),
      );
}
