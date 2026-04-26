import 'package:flutter/foundation.dart';
import '../core/api_client.dart';

class AdminProvider extends ChangeNotifier {
  final _api = ApiClient();

  Map<String, dynamic> _health = {};
  Map<String, dynamic> _usage = {};
  bool _loading = false;
  bool _clearingCache = false;
  String? _error;
  String? _successMsg;

  Map<String, dynamic> get health => _health;
  Map<String, dynamic> get usage => _usage;
  bool get loading => _loading;
  bool get clearingCache => _clearingCache;
  String? get error => _error;
  String? get successMsg => _successMsg;

  Future<void> load() async {
    _loading = true;
    _error = null;
    _successMsg = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.get('/health'),
        _api.get('/usage/stats'),
      ]);
      _health = results[0] as Map<String, dynamic>;
      _usage = results[1] as Map<String, dynamic>;
    } catch (e) {
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> clearCache() async {
    _clearingCache = true;
    _error = null;
    _successMsg = null;
    notifyListeners();

    try {
      await _api.post('/analytics/cache/clear', {});
      _successMsg = 'Cache cleared successfully';
    } catch (e) {
      _error = e.toString();
    }

    _clearingCache = false;
    notifyListeners();
  }

  Future<void> resetTokenStats() async {
    _error = null;
    _successMsg = null;
    try {
      await _api.post('/usage/reset-token-stats', {});
      _successMsg = 'Token stats reset';
      await load();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }
}
