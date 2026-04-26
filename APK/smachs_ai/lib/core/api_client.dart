import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import 'constants.dart';

class SseEvent {
  final String event;
  final Map<String, dynamic> data;
  SseEvent(this.event, this.data);
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final _http = http.Client();
  late final _dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(minutes: 3),
    headers: {'Content-Type': 'application/json'},
  ));

  // ── Generic GET ──────────────────────────────────────────────────────────────
  Future<dynamic> get(String path, {Map<String, String>? params}) async {
    final uri = Uri.parse('$kBaseUrl$path').replace(queryParameters: params);
    final res = await _http.get(uri, headers: {'Content-Type': 'application/json'});
    _checkStatus(res.statusCode, res.body);
    return jsonDecode(res.body);
  }

  // ── Generic POST ─────────────────────────────────────────────────────────────
  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$kBaseUrl$path');
    final res = await _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    _checkStatus(res.statusCode, res.body);
    return jsonDecode(res.body);
  }

  // ── Generic PATCH ────────────────────────────────────────────────────────────
  Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$kBaseUrl$path');
    final res = await _http.patch(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    _checkStatus(res.statusCode, res.body);
    return jsonDecode(res.body);
  }

  // ── Generic DELETE ───────────────────────────────────────────────────────────
  Future<dynamic> delete(String path) async {
    final uri = Uri.parse('$kBaseUrl$path');
    final res = await _http.delete(uri, headers: {'Content-Type': 'application/json'});
    _checkStatus(res.statusCode, res.body);
    if (res.body.isEmpty) return {};
    return jsonDecode(res.body);
  }

  // ── File Upload (multipart via Dio) ─────────────────────────────────────────
  Future<dynamic> uploadFile(String filePath, String fileName, Map<String, String> fields) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
      ...fields,
    });
    final res = await _dio.post('/documents/upload', data: formData);
    return res.data;
  }

  // ── SSE Streaming ────────────────────────────────────────────────────────────
  // Backend sends named SSE events:
  //   event: start\ndata: {...}\n\n
  //   event: chunk\ndata: {"text":"...","chunkIndex":1}\n\n
  //   event: complete\ndata: {"fullResponse":"...","totalChunks":N}\n\n
  //   event: error\ndata: {"message":"..."}\n\n
  Stream<SseEvent> streamSse(String path, Map<String, dynamic> body) async* {
    final uri = Uri.parse('$kBaseUrl$path');
    final request = http.Request('POST', uri);
    request.headers['Content-Type'] = 'application/json';
    request.headers['Accept'] = 'text/event-stream';
    request.body = jsonEncode(body);

    final response = await _http.send(request);

    if (response.statusCode != 200) {
      final errBody = await response.stream.bytesToString();
      throw ApiException('Stream failed ${response.statusCode}: $errBody');
    }

    String buffer = '';
    await for (final chunk in response.stream.transform(utf8.decoder)) {
      buffer += chunk;

      int sep;
      while ((sep = buffer.indexOf('\n\n')) != -1) {
        final frame = buffer.substring(0, sep);
        buffer = buffer.substring(sep + 2);

        String eventName = 'message';
        final List<String> dataLines = [];

        for (final line in frame.split('\n')) {
          if (line.startsWith('event:')) {
            eventName = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.add(line.substring(5).trim());
          }
        }

        if (dataLines.isEmpty) continue;

        try {
          final jsonStr = dataLines.join('\n');
          final data = jsonDecode(jsonStr) as Map<String, dynamic>;
          yield SseEvent(eventName, data);
        } catch (_) {
          // skip malformed frames
        }
      }
    }
  }

  void _checkStatus(int code, String body) {
    if (code >= 400) {
      String msg = 'Request failed ($code)';
      try {
        final j = jsonDecode(body);
        msg = j['error'] ?? j['message'] ?? msg;
      } catch (_) {}
      throw ApiException(msg);
    }
  }
}

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}
