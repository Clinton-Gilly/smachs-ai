class Document {
  final String documentId;
  final String title;
  final String? category;
  final String? author;
  final List<String> tags;
  final String? description;
  final int chunkCount;
  final DateTime? createdAt;
  final String? sourceType; // file | url | text

  Document({
    required this.documentId,
    required this.title,
    this.category,
    this.author,
    this.tags = const [],
    this.description,
    this.chunkCount = 0,
    this.createdAt,
    this.sourceType,
  });

  factory Document.fromJson(Map<String, dynamic> j) => Document(
        documentId: j['documentId'] ?? '',
        title: j['title'] ?? j['metadata']?['title'] ?? 'Untitled',
        category: j['category'] ?? j['metadata']?['category'],
        author: j['author'] ?? j['metadata']?['author'],
        tags: List<String>.from(j['tags'] ?? j['metadata']?['tags'] ?? []),
        description: j['description'] ?? j['metadata']?['description'],
        chunkCount: j['chunkCount'] ?? 0,
        createdAt: j['createdAt'] != null
            ? DateTime.tryParse(j['createdAt'])
            : null,
        sourceType: j['sourceType'],
      );
}
