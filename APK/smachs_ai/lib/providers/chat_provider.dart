import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../models/message.dart';
import '../models/chat_thread.dart';

class ChatProvider extends ChangeNotifier {
  final _api = ApiClient();
  final _uuid = const Uuid();

  List<ChatThread> _threads = [];
  String? _activeThreadId;
  bool _isStreaming = false;
  String? _error;

  List<ChatThread> get threads => _threads;
  ChatThread? get activeThread =>
      _threads.where((t) => t.id == _activeThreadId).firstOrNull;
  bool get isStreaming => _isStreaming;
  String? get error => _error;

  ChatProvider() {
    _loadThreads();
  }

  // ── Thread management ────────────────────────────────────────────────────────

  void newThread({String mode = kModeGeneral}) {
    final thread = ChatThread(
      id: _uuid.v4(),
      title: 'New Chat',
      mode: mode,
      messages: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    _threads.insert(0, thread);
    _activeThreadId = thread.id;
    notifyListeners();
    _saveThreads();
  }

  void selectThread(String id) {
    _activeThreadId = id;
    notifyListeners();
  }

  void deleteThread(String id) {
    _threads.removeWhere((t) => t.id == id);
    if (_activeThreadId == id) {
      _activeThreadId = _threads.isNotEmpty ? _threads.first.id : null;
    }
    notifyListeners();
    _saveThreads();
  }

  void setMode(String mode) {
    final thread = activeThread;
    if (thread == null) return;
    thread.mode = mode;
    notifyListeners();
    _saveThreads();
  }

  // ── Send message & stream ────────────────────────────────────────────────────

  Future<void> sendMessage(String content) async {
    if (_isStreaming) return;
    _error = null;

    // Ensure active thread
    if (activeThread == null) newThread();
    final thread = activeThread!;

    // Add user message
    final userMsg = ChatMessage(
      id: _uuid.v4(),
      role: 'user',
      content: content,
      timestamp: DateTime.now(),
    );
    thread.messages.add(userMsg);
    thread.updatedAt = DateTime.now();
    if (thread.title == 'New Chat' && thread.messages.length == 1) {
      thread.title = content.length > 40 ? '${content.substring(0, 40)}…' : content;
    }
    notifyListeners();

    // Add streaming placeholder
    final assistantMsg = ChatMessage(
      id: _uuid.v4(),
      role: 'assistant',
      content: '',
      timestamp: DateTime.now(),
      isStreaming: true,
    );
    thread.messages.add(assistantMsg);
    _isStreaming = true;
    notifyListeners();

    // Build message history (exclude the empty placeholder)
    final history = thread.messages
        .where((m) => m.id != assistantMsg.id)
        .map((m) => m.toJson())
        .toList();

    try {
      // Backend SSE format:
      //   event: chunk  → data.text  (incremental token)
      //   event: complete → data.fullResponse (full answer)
      //   event: error   → data.message
      final stream = _api.streamSse('/chat/stream', {'messages': history});
      String accumulated = '';

      await for (final event in stream) {
        switch (event.event) {
          case 'chunk':
            accumulated += (event.data['text'] as String? ?? '');
            _updateLastMessage(thread, assistantMsg.id, accumulated, streaming: true);
          case 'complete':
            final full = event.data['fullResponse'] as String?;
            _updateLastMessage(
              thread, assistantMsg.id,
              (full != null && full.isNotEmpty) ? full : accumulated,
              streaming: false,
            );
          case 'error':
            throw ApiException(event.data['message'] as String? ?? 'Stream error');
        }
      }

      // If nothing came through, mark complete with whatever accumulated
      final idx = thread.messages.indexWhere((m) => m.id == assistantMsg.id);
      if (idx != -1 && thread.messages[idx].isStreaming) {
        _updateLastMessage(
          thread, assistantMsg.id,
          accumulated.isNotEmpty ? accumulated : 'No response received.',
          streaming: false,
        );
      }
    } catch (e) {
      _updateLastMessage(thread, assistantMsg.id, 'Error: $e', streaming: false);
      _error = e.toString();
    }

    _isStreaming = false;
    thread.updatedAt = DateTime.now();
    notifyListeners();
    _saveThreads();
  }

  void _updateLastMessage(ChatThread thread, String msgId, String content,
      {required bool streaming}) {
    final idx = thread.messages.indexWhere((m) => m.id == msgId);
    if (idx != -1) {
      thread.messages[idx] = thread.messages[idx].copyWith(
        content: content,
        isStreaming: streaming,
      );
      notifyListeners();
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  Future<void> _saveThreads() async {
    final prefs = await SharedPreferences.getInstance();
    final data = jsonEncode(_threads.map((t) => t.toJson()).toList());
    await prefs.setString('chat_threads', data);
  }

  Future<void> _loadThreads() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('chat_threads');
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List;
        _threads = list
            .map((j) => ChatThread.fromJson(j as Map<String, dynamic>))
            .toList();
        if (_threads.isNotEmpty) _activeThreadId = _threads.first.id;
      } catch (_) {}
    }
    notifyListeners();
  }
}
