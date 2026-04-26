import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/analytics_provider.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  String _range = '7d';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnalyticsProvider>().load(timeRange: _range);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AnalyticsProvider>(builder: (ctx, prov, _) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Analytics'),
          actions: [
            _RangeSelector(current: _range, onChanged: (r) {
              setState(() => _range = r);
              prov.load(timeRange: r);
            }),
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => prov.load(timeRange: _range),
            ),
          ],
        ),
        body: prov.loading
            ? const Center(child: CircularProgressIndicator())
            : prov.error != null
                ? _ErrorView(error: prov.error!, onRetry: () => prov.load(timeRange: _range))
                : RefreshIndicator(
                    onRefresh: () => prov.load(timeRange: _range),
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _SectionLabel('Overview'),
                        _OverviewCards(stats: prov.stats),
                        const SizedBox(height: 20),

                        _SectionLabel('Cache Performance'),
                        _CacheCard(stats: prov.stats),
                        const SizedBox(height: 20),

                        if (prov.popular.isNotEmpty) ...[
                          _SectionLabel('Popular Queries'),
                          _QueryList(queries: prov.popular, showTime: false),
                          const SizedBox(height: 20),
                        ],

                        if (prov.slow.isNotEmpty) ...[
                          _SectionLabel('Slow Queries'),
                          _QueryList(queries: prov.slow, showTime: true),
                          const SizedBox(height: 20),
                        ],

                        if (prov.methods.isNotEmpty) ...[
                          _SectionLabel('Retrieval Methods'),
                          _MethodList(methods: prov.methods),
                          const SizedBox(height: 20),
                        ],

                        _SectionLabel('Feedback Summary'),
                        _FeedbackCard(feedback: prov.feedback),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
      );
    });
  }
}

// ── Range Selector ────────────────────────────────────────────────────────────

class _RangeSelector extends StatelessWidget {
  final String current;
  final void Function(String) onChanged;
  const _RangeSelector({required this.current, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      initialValue: current,
      onSelected: onChanged,
      tooltip: 'Time range',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(current, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600)),
            const Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
      itemBuilder: (_) => const [
        PopupMenuItem(value: '24h', child: Text('Last 24h')),
        PopupMenuItem(value: '7d', child: Text('Last 7 days')),
        PopupMenuItem(value: '30d', child: Text('Last 30 days')),
      ],
    );
  }
}

// ── Overview Cards ────────────────────────────────────────────────────────────

class _OverviewCards extends StatelessWidget {
  final Map<String, dynamic> stats;
  const _OverviewCards({required this.stats});

  @override
  Widget build(BuildContext context) {
    final total = stats['totalQueries'] ?? 0;
    final success = stats['successRate'] ?? 0;
    final avgTime = stats['avgResponseTime'] ?? 0;

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.6,
      children: [
        _StatCard(label: 'Total Queries', value: '$total', icon: Icons.query_stats),
        _StatCard(label: 'Success Rate', value: '${success.toStringAsFixed(1)}%', icon: Icons.check_circle_outline),
        _StatCard(label: 'Avg Response', value: '${avgTime}ms', icon: Icons.timer_outlined),
        _StatCard(label: 'Active Period', value: stats['period'] ?? '-', icon: Icons.calendar_today_outlined),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  const _StatCard({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, size: 20, color: cs.primary),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                Text(label, style: const TextStyle(fontSize: 11, color: Colors.white54)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Cache Card ────────────────────────────────────────────────────────────────

class _CacheCard extends StatelessWidget {
  final Map<String, dynamic> stats;
  const _CacheCard({required this.stats});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final cache = stats['cacheStats'] as Map<String, dynamic>? ?? {};
    final hits = cache['hits'] ?? 0;
    final misses = cache['misses'] ?? 0;
    final total = hits + misses;
    final rate = total > 0 ? (hits / total * 100).toStringAsFixed(1) : '0.0';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.bolt_outlined, size: 16, color: cs.primary),
              const SizedBox(width: 6),
              const Text('Cache Hit Rate', style: TextStyle(fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: total > 0 ? hits / total : 0,
              backgroundColor: Colors.white12,
              color: cs.primary,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('$rate% hit rate', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                Text('$hits hits / $misses misses', style: const TextStyle(fontSize: 11, color: Colors.white54)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Query List ────────────────────────────────────────────────────────────────

class _QueryList extends StatelessWidget {
  final List<dynamic> queries;
  final bool showTime;
  const _QueryList({required this.queries, required this.showTime});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Column(
        children: queries.take(8).toList().asMap().entries.map((e) {
          final i = e.key;
          final q = e.value as Map<String, dynamic>;
          return Column(
            children: [
              ListTile(
                dense: true,
                leading: CircleAvatar(
                  radius: 12,
                  backgroundColor: cs.primary.withValues(alpha: 0.15),
                  child: Text('${i + 1}', style: TextStyle(fontSize: 11, color: cs.primary)),
                ),
                title: Text(q['query'] ?? '-',
                    style: const TextStyle(fontSize: 13),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                trailing: showTime
                    ? Text('${q['responseTime'] ?? 0}ms',
                        style: TextStyle(fontSize: 11, color: cs.primary))
                    : Text('×${q['count'] ?? 0}',
                        style: TextStyle(fontSize: 11, color: cs.primary)),
              ),
              if (i < queries.length - 1) const Divider(height: 1, indent: 48),
            ],
          );
        }).toList(),
      ),
    );
  }
}

// ── Method List ───────────────────────────────────────────────────────────────

class _MethodList extends StatelessWidget {
  final List<dynamic> methods;
  const _MethodList({required this.methods});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Column(
        children: methods.asMap().entries.map((e) {
          final i = e.key;
          final m = e.value as Map<String, dynamic>;
          return Column(
            children: [
              ListTile(
                dense: true,
                title: Text(m['method'] ?? '-', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                subtitle: Text('${m['count'] ?? 0} queries', style: const TextStyle(fontSize: 11)),
                trailing: Text('${m['avgTime'] ?? 0}ms',
                    style: TextStyle(fontSize: 12, color: cs.primary, fontWeight: FontWeight.w600)),
              ),
              if (i < methods.length - 1) const Divider(height: 1, indent: 16),
            ],
          );
        }).toList(),
      ),
    );
  }
}

// ── Feedback Card ─────────────────────────────────────────────────────────────

class _FeedbackCard extends StatelessWidget {
  final Map<String, dynamic> feedback;
  const _FeedbackCard({required this.feedback});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final avg = feedback['averageRating'];
    final total = feedback['totalFeedback'] ?? 0;
    final helpful = feedback['helpfulCount'] ?? 0;
    final issues = feedback['commonIssues'] as List? ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.thumb_up_outlined, size: 16, color: cs.primary),
                const SizedBox(width: 6),
                Text('$total responses rated', style: const TextStyle(fontSize: 13)),
                const Spacer(),
                if (avg != null)
                  Row(children: [
                    const Icon(Icons.star, size: 14, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text('$avg / 5', style: const TextStyle(fontWeight: FontWeight.w600)),
                  ]),
              ],
            ),
            if (total > 0) ...[
              const SizedBox(height: 8),
              Text('$helpful helpful out of $total', style: const TextStyle(fontSize: 12, color: Colors.white54)),
            ],
            if (issues.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Common issues:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
              const SizedBox(height: 6),
              ...issues.take(4).map((i) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(children: [
                      const Icon(Icons.circle, size: 5, color: Colors.white38),
                      const SizedBox(width: 8),
                      Text('$i', style: const TextStyle(fontSize: 12, color: Colors.white70)),
                    ]),
                  )),
            ],
            if (total == 0)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('No feedback collected yet', style: TextStyle(fontSize: 12, color: Colors.white38)),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Section Label ─────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white54, letterSpacing: 0.5)),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(error, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
