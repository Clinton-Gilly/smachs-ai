import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../models/chat_thread.dart';
import '../providers/chat_provider.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _drawerOpen = false;

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send(ChatProvider prov) async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || prov.isStreaming) return;
    _inputCtrl.clear();
    await prov.sendMessage(text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ChatProvider>(builder: (ctx, prov, _) {
      final thread = prov.activeThread;
      _scrollToBottom();

      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => setState(() => _drawerOpen = !_drawerOpen),
          ),
          title: Text(thread?.title ?? 'Smachs AI'),
          actions: [
            _ModeSelector(
              current: thread?.mode ?? kModeGeneral,
              onChanged: (m) => prov.setMode(m),
            ),
            IconButton(
              icon: const Icon(Icons.add_comment_outlined),
              tooltip: 'New chat',
              onPressed: () => prov.newThread(),
            ),
          ],
        ),
        body: Row(
          children: [
            // Side thread drawer (inline on mobile)
            if (_drawerOpen)
              _ThreadDrawer(
                threads: prov.threads,
                activeId: prov.activeThread?.id,
                onSelect: (id) {
                  prov.selectThread(id);
                  setState(() => _drawerOpen = false);
                },
                onDelete: (id) => prov.deleteThread(id),
                onNew: () {
                  prov.newThread();
                  setState(() => _drawerOpen = false);
                },
              ),

            // Main chat area
            Expanded(
              child: Column(
                children: [
                  Expanded(
                    child: thread == null || thread.messages.isEmpty
                        ? _WelcomeView(onPrompt: (p) {
                            if (prov.activeThread == null) prov.newThread();
                            _inputCtrl.text = p;
                            _send(prov);
                          })
                        : ListView.builder(
                            controller: _scrollCtrl,
                            padding: const EdgeInsets.all(16),
                            itemCount: thread.messages.length,
                            itemBuilder: (_, i) => _MessageBubble(msg: thread.messages[i]),
                          ),
                  ),
                  _InputBar(
                    controller: _inputCtrl,
                    streaming: prov.isStreaming,
                    onSend: () => _send(prov),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    });
  }
}

// ── Thread Drawer ─────────────────────────────────────────────────────────────

class _ThreadDrawer extends StatelessWidget {
  final List<ChatThread> threads;
  final String? activeId;
  final void Function(String) onSelect;
  final void Function(String) onDelete;
  final VoidCallback onNew;

  const _ThreadDrawer({
    required this.threads,
    required this.activeId,
    required this.onSelect,
    required this.onDelete,
    required this.onNew,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border(right: BorderSide(color: cs.outline)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: ElevatedButton.icon(
              onPressed: onNew,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('New Chat'),
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(40)),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.builder(
              itemCount: threads.length,
              itemBuilder: (_, i) {
                final t = threads[i];
                final active = t.id == activeId;
                return ListTile(
                  dense: true,
                  selected: active,
                  selectedTileColor: cs.primary.withValues(alpha: 0.1),
                  title: Text(t.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13)),
                  subtitle: Text(t.mode, style: TextStyle(fontSize: 11, color: cs.primary)),
                  trailing: IconButton(
                    icon: const Icon(Icons.close, size: 14),
                    onPressed: () => onDelete(t.id),
                  ),
                  onTap: () => onSelect(t.id),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Mode Selector ─────────────────────────────────────────────────────────────

class _ModeSelector extends StatelessWidget {
  final String current;
  final void Function(String) onChanged;

  const _ModeSelector({required this.current, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      initialValue: current,
      onSelected: onChanged,
      tooltip: 'Chat mode',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(current,
                style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600)),
            const Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
      itemBuilder: (_) => [
        const PopupMenuItem(value: kModeGeneral, child: Text('General')),
        const PopupMenuItem(value: kModeRag, child: Text('RAG')),
        const PopupMenuItem(value: kModeCoanony, child: Text('Coanony')),
      ],
    );
  }
}

// ── Message Bubble ────────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final dynamic msg;
  const _MessageBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    final isUser = msg.role == 'user';
    final cs = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: cs.primary,
              child: const Text('S', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? cs.primary : cs.surface,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: isUser ? null : Border.all(color: cs.outline),
              ),
              child: msg.isStreaming && (msg.content as String).isEmpty
                  ? const _TypingIndicator()
                  : isUser
                      ? Text(msg.content,
                          style: TextStyle(color: cs.onPrimary, fontSize: 14))
                      : MarkdownBody(
                          data: msg.content,
                          styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
                            p: TextStyle(fontSize: 14, color: cs.onSurface),
                            code: TextStyle(
                                fontSize: 12,
                                backgroundColor: Colors.black26,
                                color: const Color(0xFF6EE7B7)),
                          ),
                        ),
            ),
          ),
          if (isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _ctrl,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (i) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: CircleAvatar(radius: 3, backgroundColor: Colors.white60),
        )),
      ),
    );
  }
}

// ── Welcome View ──────────────────────────────────────────────────────────────

class _WelcomeView extends StatelessWidget {
  final void Function(String) onPrompt;
  const _WelcomeView({required this.onPrompt});

  static const _prompts = [
    'What documents have I uploaded?',
    'Summarize the key points in my knowledge base.',
    'Explain how RAG retrieval works.',
    'What can Smachs AI help me with?',
  ];

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 36,
              backgroundColor: cs.primary,
              child: const Text('S', style: TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 16),
            Text('Welcome to Smachs AI',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('RAG-powered assistant — ask anything from your documents.',
                textAlign: TextAlign.center,
                style: TextStyle(color: cs.onSurface.withValues(alpha: 0.6), fontSize: 14)),
            const SizedBox(height: 32),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: _prompts
                  .map((p) => ActionChip(
                        label: Text(p, style: const TextStyle(fontSize: 12)),
                        onPressed: () => onPrompt(p),
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Input Bar ─────────────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool streaming;
  final VoidCallback onSend;

  const _InputBar({
    required this.controller,
    required this.streaming,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      decoration: BoxDecoration(
        color: cs.surface,
        border: Border(top: BorderSide(color: cs.outline)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 5,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(hintText: 'Message Smachs AI…'),
                onSubmitted: (_) => onSend(),
              ),
            ),
            const SizedBox(width: 8),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: streaming
                  ? const SizedBox(
                      width: 42,
                      height: 42,
                      child: Padding(
                        padding: EdgeInsets.all(10),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : IconButton.filled(
                      onPressed: onSend,
                      icon: const Icon(Icons.send_rounded),
                      style: IconButton.styleFrom(backgroundColor: cs.primary),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
