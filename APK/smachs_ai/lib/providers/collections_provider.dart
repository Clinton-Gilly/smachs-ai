import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/collection.dart';

class CollectionsProvider extends ChangeNotifier {
  final _api = ApiClient();

  List<Collection> _collections = [];
  bool _loading = false;
  String? _error;

  List<Collection> get collections => _collections;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadCollections() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await _api.get('/collections');
      _collections = (res['collections'] as List? ?? res as List? ?? [])
          .map((j) => Collection.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (e) {
      _error = e.toString();
    }
    _loading = false;
    notifyListeners();
  }

  Future<bool> createCollection(String name, String? description) async {
    _error = null;
    try {
      await _api.post('/collections', {
        'name': name,
        if (description != null && description.isNotEmpty) 'description': description,
      });
      await loadCollections();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteCollection(String id) async {
    _error = null;
    try {
      await _api.delete('/collections/$id');
      _collections.removeWhere((c) => c.id == id);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> addDocument(String collectionId, String documentId) async {
    _error = null;
    try {
      await _api.post('/collections/$collectionId/documents', {'documentId': documentId});
      await loadCollections();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> removeDocument(String collectionId, String documentId) async {
    _error = null;
    try {
      await _api.delete('/collections/$collectionId/documents/$documentId');
      await loadCollections();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
