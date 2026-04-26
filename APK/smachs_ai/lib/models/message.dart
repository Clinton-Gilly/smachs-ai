class ChatMessage {
  final String id;
  final String role; // 'user' | 'assistant'
  final String content;
  final DateTime timestamp;
  final bool isStreaming;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.isStreaming = false,
  });

  ChatMessage copyWith({String? content, bool? isStreaming}) => ChatMessage(
        id: id,
        role: role,
        content: content ?? this.content,
        timestamp: timestamp,
        isStreaming: isStreaming ?? this.isStreaming,
      );

  Map<String, dynamic> toJson() => {'role': role, 'content': content};

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'] ?? '',
        role: j['role'] ?? 'user',
        content: j['content'] ?? '',
        timestamp: j['timestamp'] != null
            ? DateTime.tryParse(j['timestamp']) ?? DateTime.now()
            : DateTime.now(),
      );
}
