import 'package:flutter/foundation.dart';
import '../core/api_client.dart';

class AnalyticsProvider extends ChangeNotifier {
  final _api = ApiClient();

  Map<String, dynamic> _stats = {};
  List<dynamic> _popular = [];
  List<dynamic> _slow = [];
  List<dynamic> _methods = [];
  Map<String, dynamic> _feedback = {};
  bool _loading = false;
  String? _error;
  String _timeRange = '7d';

  Map<String, dynamic> get stats => _stats;
  List<dynamic> get popular => _popular;
  List<dynamic> get slow => _slow;
  List<dynamic> get methods => _methods;
  Map<String, dynamic> get feedback => _feedback;
  bool get loading => _loading;
  String? get error => _error;
  String get timeRange => _timeRange;

  Future<void> load({String timeRange = '7d'}) async {
    _timeRange = timeRange;
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.get('/analytics/stats', params: {'timeRange': timeRange}),
        _api.get('/analytics/popular', params: {'timeRange': timeRange, 'limit': '10'}),
        _api.get('/analytics/slow', params: {'timeRange': timeRange, 'limit': '10'}),
        _api.get('/analytics/methods', params: {'timeRange': timeRange}),
        _api.get('/analytics/feedback/summary', params: {'timeRange': timeRange}),
      ]);

      _stats = results[0] as Map<String, dynamic>;
      _popular = (results[1] as Map<String, dynamic>?)?['queries'] as List? ?? [];
      _slow = (results[2] as Map<String, dynamic>?)?['queries'] as List? ?? [];
      _methods = (results[3] as Map<String, dynamic>?)?['methods'] as List? ?? [];
      _feedback = results[4] as Map<String, dynamic>;
    } catch (e) {
      _error = e.toString();
    }

    _loading = false;
    notifyListeners();
  }
}
