class Collection {
  final String id;
  final String name;
  final String? description;
  final List<String> documentIds;
  final DateTime? createdAt;

  Collection({
    required this.id,
    required this.name,
    this.description,
    this.documentIds = const [],
    this.createdAt,
  });

  factory Collection.fromJson(Map<String, dynamic> j) => Collection(
        id: j['_id'] ?? j['id'] ?? '',
        name: j['name'] ?? 'Unnamed',
        description: j['description'],
        documentIds: List<String>.from(j['documentIds'] ?? []),
        createdAt: j['createdAt'] != null
            ? DateTime.tryParse(j['createdAt'])
            : null,
      );
}
