import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/document.dart';

class DocumentsProvider extends ChangeNotifier {
  final _api = ApiClient();

  List<Document> _documents = [];
  bool _loading = false;
  String? _error;
  String _search = '';
  String? _categoryFilter;
  int _page = 1;
  bool _hasMore = true;
  Map<String, dynamic> _stats = {};

  List<Document> get documents => _documents;
  bool get loading => _loading;
  String? get error => _error;
  Map<String, dynamic> get stats => _stats;
  bool get hasMore => _hasMore;

  // ── Load documents ───────────────────────────────────────────────────────────

  Future<void> loadDocuments({bool refresh = false}) async {
    if (_loading) return;
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _documents = [];
    }
    if (!_hasMore) return;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final params = <String, String>{
        'page': '$_page',
        'limit': '20',
        if (_search.isNotEmpty) 'search': _search,
        if (_categoryFilter != null) 'category': _categoryFilter!,
      };
      final res = await _api.get('/documents', params: params);
      final list = (res['documents'] as List? ?? [])
          .map((j) => Document.fromJson(j as Map<String, dynamic>))
          .toList();

      if (refresh) {
        _documents = list;
      } else {
        _documents.addAll(list);
      }
      _hasMore = list.length == 20;
      _page++;
    } catch (e) {
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }

  void setSearch(String query) {
    _search = query;
    loadDocuments(refresh: true);
  }

  void setCategory(String? cat) {
    _categoryFilter = cat;
    loadDocuments(refresh: true);
  }

  // ── Upload file ──────────────────────────────────────────────────────────────

  Future<bool> uploadFile(String path, String name, Map<String, String> meta) async {
    _error = null;
    try {
      await _api.uploadFile(path, name, meta);
      await loadDocuments(refresh: true);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ── Upload URL ───────────────────────────────────────────────────────────────

  Future<bool> uploadUrl(String url, Map<String, dynamic> meta) async {
    _error = null;
    try {
      await _api.post('/documents/url', {'url': url, ...meta});
      await loadDocuments(refresh: true);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ── Upload raw text ──────────────────────────────────────────────────────────

  Future<bool> uploadText(String text, Map<String, dynamic> meta) async {
    _error = null;
    try {
      await _api.post('/documents/text', {'text': text, ...meta});
      await loadDocuments(refresh: true);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  Future<bool> deleteDocument(String docId) async {
    _error = null;
    try {
      await _api.delete('/documents/$docId');
      _documents.removeWhere((d) => d.documentId == docId);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ── Update metadata ──────────────────────────────────────────────────────────

  Future<bool> updateDocument(String docId, Map<String, dynamic> data) async {
    _error = null;
    try {
      await _api.patch('/documents/$docId', data);
      await loadDocuments(refresh: true);
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  Future<void> loadStats() async {
    try {
      _stats = (await _api.get('/documents/stats')) as Map<String, dynamic>;
      notifyListeners();
    } catch (_) {}
  }
}
