import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/document.dart';
import '../providers/documents_provider.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DocumentsProvider>().loadDocuments(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<DocumentsProvider>(builder: (ctx, prov, _) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Documents'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => prov.loadDocuments(refresh: true),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _showUploadSheet(context, prov),
          icon: const Icon(Icons.upload_file),
          label: const Text('Upload'),
        ),
        body: Column(
          children: [
            // Stats bar
            if (prov.stats.isNotEmpty) _StatsBar(stats: prov.stats),

            // Search
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _searchCtrl,
                decoration: InputDecoration(
                  hintText: 'Search documents…',
                  prefixIcon: const Icon(Icons.search, size: 18),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 16),
                          onPressed: () {
                            _searchCtrl.clear();
                            prov.setSearch('');
                          })
                      : null,
                ),
                onChanged: (v) => prov.setSearch(v),
              ),
            ),

            // Error
            if (prov.error != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Text(prov.error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 13)),
              ),

            // List
            Expanded(
              child: prov.loading && prov.documents.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : prov.documents.isEmpty
                      ? _EmptyState(onUpload: () => _showUploadSheet(context, prov))
                      : RefreshIndicator(
                          onRefresh: () => prov.loadDocuments(refresh: true),
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                            itemCount: prov.documents.length + (prov.hasMore ? 1 : 0),
                            itemBuilder: (_, i) {
                              if (i == prov.documents.length) {
                                prov.loadDocuments();
                                return const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(child: CircularProgressIndicator()),
                                );
                              }
                              return _DocumentCard(
                                doc: prov.documents[i],
                                onDelete: () => _confirmDelete(context, prov, prov.documents[i]),
                                onEdit: () => _showEditSheet(context, prov, prov.documents[i]),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      );
    });
  }

  // ── Upload sheet ─────────────────────────────────────────────────────────────

  void _showUploadSheet(BuildContext context, DocumentsProvider prov) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _UploadSheet(provider: prov),
    );
  }

  // ── Edit sheet ───────────────────────────────────────────────────────────────

  void _showEditSheet(BuildContext context, DocumentsProvider prov, Document doc) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _EditSheet(doc: doc, provider: prov),
    );
  }

  // ── Delete confirm ───────────────────────────────────────────────────────────

  Future<void> _confirmDelete(BuildContext context, DocumentsProvider prov, Document doc) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        title: const Text('Delete Document'),
        content: Text('Delete "${doc.title}"? This cannot be undone.'),
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
      final success = await prov.deleteDocument(doc.documentId);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(success ? 'Deleted "${doc.title}"' : prov.error ?? 'Error'),
        ));
      }
    }
  }
}

// ── Document Card ─────────────────────────────────────────────────────────────

class _DocumentCard extends StatelessWidget {
  final Document doc;
  final VoidCallback onDelete;
  final VoidCallback onEdit;

  const _DocumentCard({required this.doc, required this.onDelete, required this.onEdit});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.description_outlined, size: 18, color: cs.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(doc.title,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                ),
                PopupMenuButton<String>(
                  onSelected: (v) => v == 'delete' ? onDelete() : onEdit(),
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'edit', child: Text('Edit metadata')),
                    const PopupMenuItem(
                        value: 'delete',
                        child: Text('Delete', style: TextStyle(color: Colors.red))),
                  ],
                  child: const Icon(Icons.more_vert, size: 18),
                ),
              ],
            ),
            if (doc.description != null && doc.description!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(doc.description!,
                  style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.6)),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                if (doc.category != null)
                  Chip(label: Text(doc.category!), avatar: const Icon(Icons.folder_outlined, size: 12)),
                if (doc.author != null)
                  Chip(label: Text(doc.author!), avatar: const Icon(Icons.person_outline, size: 12)),
                Chip(
                  label: Text('${doc.chunkCount} chunks'),
                  avatar: const Icon(Icons.layers_outlined, size: 12),
                ),
                ...doc.tags.take(3).map((t) => Chip(label: Text('#$t'))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Upload Sheet ──────────────────────────────────────────────────────────────

class _UploadSheet extends StatefulWidget {
  final DocumentsProvider provider;
  const _UploadSheet({required this.provider});

  @override
  State<_UploadSheet> createState() => _UploadSheetState();
}

class _UploadSheetState extends State<_UploadSheet> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);
  final _titleCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _authorCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _textCtrl = TextEditingController();
  bool _uploading = false;

  @override
  void dispose() {
    _tabs.dispose();
    _titleCtrl.dispose();
    _categoryCtrl.dispose();
    _authorCtrl.dispose();
    _urlCtrl.dispose();
    _textCtrl.dispose();
    super.dispose();
  }

  Map<String, String> get _meta => {
        if (_titleCtrl.text.isNotEmpty) 'title': _titleCtrl.text,
        if (_categoryCtrl.text.isNotEmpty) 'category': _categoryCtrl.text,
        if (_authorCtrl.text.isNotEmpty) 'author': _authorCtrl.text,
      };

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'docx', 'txt', 'md'],
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.path == null) return;

    setState(() => _uploading = true);
    final ok = await widget.provider.uploadFile(file.path!, file.name, _meta);
    setState(() => _uploading = false);

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Uploaded "${file.name}"' : widget.provider.error ?? 'Upload failed'),
        backgroundColor: ok ? Colors.green : Colors.red,
      ));
    }
  }

  Future<void> _uploadUrl() async {
    if (_urlCtrl.text.trim().isEmpty) return;
    setState(() => _uploading = true);
    final ok = await widget.provider.uploadUrl(_urlCtrl.text.trim(), _meta);
    setState(() => _uploading = false);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'URL ingested' : widget.provider.error ?? 'Failed'),
        backgroundColor: ok ? Colors.green : Colors.red,
      ));
    }
  }

  Future<void> _uploadText() async {
    if (_textCtrl.text.trim().isEmpty) return;
    setState(() => _uploading = true);
    final ok = await widget.provider.uploadText(_textCtrl.text.trim(), _meta);
    setState(() => _uploading = false);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Text uploaded' : widget.provider.error ?? 'Failed'),
        backgroundColor: ok ? Colors.green : Colors.red,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, ctrl) => SingleChildScrollView(
          controller: ctrl,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Add Document', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              // Metadata fields
              TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title (optional)')),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: TextField(controller: _categoryCtrl, decoration: const InputDecoration(labelText: 'Category'))),
                  const SizedBox(width: 10),
                  Expanded(child: TextField(controller: _authorCtrl, decoration: const InputDecoration(labelText: 'Author'))),
                ],
              ),
              const SizedBox(height: 16),

              // Upload tabs
              TabBar(
                controller: _tabs,
                tabs: const [Tab(text: 'File'), Tab(text: 'URL'), Tab(text: 'Text')],
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 160,
                child: TabBarView(
                  controller: _tabs,
                  children: [
                    // File tab
                    Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.upload_file, size: 48, color: Colors.white38),
                        const SizedBox(height: 12),
                        const Text('PDF, DOCX, TXT, MD (max 50MB)', style: TextStyle(color: Colors.white54, fontSize: 12)),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _uploading ? null : _pickAndUpload,
                          icon: const Icon(Icons.folder_open),
                          label: const Text('Choose File'),
                        ),
                      ]),
                    ),
                    // URL tab
                    Column(mainAxisSize: MainAxisSize.min, children: [
                      TextField(controller: _urlCtrl, decoration: const InputDecoration(labelText: 'https://…', prefixIcon: Icon(Icons.link))),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _uploading ? null : _uploadUrl, child: const Text('Ingest URL')),
                    ]),
                    // Text tab
                    Column(mainAxisSize: MainAxisSize.min, children: [
                      TextField(controller: _textCtrl, maxLines: 5, decoration: const InputDecoration(hintText: 'Paste your text here…')),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _uploading ? null : _uploadText, child: const Text('Upload Text')),
                    ]),
                  ],
                ),
              ),
              if (_uploading) ...[
                const SizedBox(height: 16),
                const Center(child: CircularProgressIndicator()),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Edit Sheet ────────────────────────────────────────────────────────────────

class _EditSheet extends StatefulWidget {
  final Document doc;
  final DocumentsProvider provider;
  const _EditSheet({required this.doc, required this.provider});

  @override
  State<_EditSheet> createState() => _EditSheetState();
}

class _EditSheetState extends State<_EditSheet> {
  late final _titleCtrl = TextEditingController(text: widget.doc.title);
  late final _categoryCtrl = TextEditingController(text: widget.doc.category ?? '');
  late final _authorCtrl = TextEditingController(text: widget.doc.author ?? '');
  late final _descCtrl = TextEditingController(text: widget.doc.description ?? '');
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _categoryCtrl.dispose();
    _authorCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final ok = await widget.provider.updateDocument(widget.doc.documentId, {
      'title': _titleCtrl.text,
      'category': _categoryCtrl.text,
      'author': _authorCtrl.text,
      'description': _descCtrl.text,
    });
    setState(() => _saving = false);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Updated' : widget.provider.error ?? 'Error'),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text('Edit Metadata', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
            const SizedBox(height: 10),
            TextField(controller: _categoryCtrl, decoration: const InputDecoration(labelText: 'Category')),
            const SizedBox(height: 10),
            TextField(controller: _authorCtrl, decoration: const InputDecoration(labelText: 'Author')),
            const SizedBox(height: 10),
            TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Changes'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final VoidCallback onUpload;
  const _EmptyState({required this.onUpload});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.folder_open_outlined, size: 64, color: Colors.white24),
          const SizedBox(height: 16),
          const Text('No documents yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          const Text('Upload files, URLs, or raw text', style: TextStyle(color: Colors.white54, fontSize: 13)),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: onUpload,
            icon: const Icon(Icons.upload_file),
            label: const Text('Upload Document'),
          ),
        ],
      ),
    );
  }
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

class _StatsBar extends StatelessWidget {
  final Map<String, dynamic> stats;
  const _StatsBar({required this.stats});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cs.outline),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _Stat(label: 'Documents', value: '${stats['totalDocuments'] ?? 0}'),
          _Stat(label: 'Chunks', value: '${stats['totalChunks'] ?? 0}'),
          _Stat(label: 'Categories', value: '${stats['categories'] ?? 0}'),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white54)),
      ],
    );
  }
}
