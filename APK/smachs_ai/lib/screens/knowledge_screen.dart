import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/collection.dart';
import '../providers/collections_provider.dart';
import '../providers/documents_provider.dart';

class KnowledgeScreen extends StatefulWidget {
  const KnowledgeScreen({super.key});

  @override
  State<KnowledgeScreen> createState() => _KnowledgeScreenState();
}

class _KnowledgeScreenState extends State<KnowledgeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CollectionsProvider>().loadCollections();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CollectionsProvider>(builder: (ctx, prov, _) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Knowledge Base'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: prov.loadCollections,
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _showCreateSheet(context, prov),
          icon: const Icon(Icons.add),
          label: const Text('New Collection'),
        ),
        body: prov.loading
            ? const Center(child: CircularProgressIndicator())
            : prov.collections.isEmpty
                ? _EmptyState(onCreate: () => _showCreateSheet(context, prov))
                : RefreshIndicator(
                    onRefresh: prov.loadCollections,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                      itemCount: prov.collections.length,
                      itemBuilder: (_, i) => _CollectionCard(
                        collection: prov.collections[i],
                        onDelete: () => _confirmDelete(context, prov, prov.collections[i]),
                        onManage: () => _showManageSheet(context, prov, prov.collections[i]),
                      ),
                    ),
                  ),
      );
    });
  }

  void _showCreateSheet(BuildContext context, CollectionsProvider prov) {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              Text('New Collection', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Collection name *')),
              const SizedBox(height: 10),
              TextField(controller: descCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Description (optional)')),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (nameCtrl.text.trim().isEmpty) return;
                    final ok = await prov.createCollection(nameCtrl.text.trim(), descCtrl.text.trim());
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(ok ? 'Collection created' : prov.error ?? 'Error'),
                        backgroundColor: ok ? Colors.green : Colors.red,
                      ));
                    }
                  },
                  child: const Text('Create'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showManageSheet(BuildContext context, CollectionsProvider cprov, Collection col) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ManageSheet(collection: col, cprov: cprov),
    );
  }

  Future<void> _confirmDelete(BuildContext context, CollectionsProvider prov, Collection col) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        title: const Text('Delete Collection'),
        content: Text('Delete "${col.name}"? Documents won\'t be deleted.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dlgCtx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(dlgCtx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      await prov.deleteCollection(col.id);
    }
  }
}

// ── Collection Card ───────────────────────────────────────────────────────────

class _CollectionCard extends StatelessWidget {
  final Collection collection;
  final VoidCallback onDelete;
  final VoidCallback onManage;

  const _CollectionCard({required this.collection, required this.onDelete, required this.onManage});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: cs.primary.withValues(alpha: 0.15),
          child: Icon(Icons.library_books_outlined, color: cs.primary, size: 20),
        ),
        title: Text(collection.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (collection.description != null && collection.description!.isNotEmpty)
              Text(collection.description!, style: const TextStyle(fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text('${collection.documentIds.length} documents',
                style: TextStyle(fontSize: 11, color: cs.primary)),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (v) => v == 'delete' ? onDelete() : onManage(),
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'manage', child: Text('Manage documents')),
            const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
          ],
          child: const Icon(Icons.more_vert),
        ),
        onTap: onManage,
      ),
    );
  }
}

// ── Manage Sheet ──────────────────────────────────────────────────────────────

class _ManageSheet extends StatefulWidget {
  final Collection collection;
  final CollectionsProvider cprov;
  const _ManageSheet({required this.collection, required this.cprov});

  @override
  State<_ManageSheet> createState() => _ManageSheetState();
}

class _ManageSheetState extends State<_ManageSheet> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DocumentsProvider>().loadDocuments(refresh: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<DocumentsProvider>(builder: (ctx, dprov, _) {
      final colDocIds = widget.collection.documentIds.toSet();
      return DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, ctrl) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)))),
                  const SizedBox(height: 12),
                  Text('Manage: ${widget.collection.name}', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Toggle documents to add/remove from this collection',
                      style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.5))),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: dprov.loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      controller: ctrl,
                      itemCount: dprov.documents.length,
                      itemBuilder: (_, i) {
                        final doc = dprov.documents[i];
                        final inCol = colDocIds.contains(doc.documentId);
                        return CheckboxListTile(
                          title: Text(doc.title, style: const TextStyle(fontSize: 13)),
                          subtitle: doc.category != null ? Text(doc.category!, style: const TextStyle(fontSize: 11)) : null,
                          value: inCol,
                          onChanged: (v) async {
                            if (v == true) {
                              await widget.cprov.addDocument(widget.collection.id, doc.documentId);
                            } else {
                              await widget.cprov.removeDocument(widget.collection.id, doc.documentId);
                            }
                            setState(() {});
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      );
    });
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyState({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.library_books_outlined, size: 64, color: Colors.white24),
          const SizedBox(height: 16),
          const Text('No collections yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          const Text('Group your documents into knowledge bases', style: TextStyle(color: Colors.white54, fontSize: 13)),
          const SizedBox(height: 20),
          ElevatedButton.icon(onPressed: onCreate, icon: const Icon(Icons.add), label: const Text('Create Collection')),
        ],
      ),
    );
  }
}
