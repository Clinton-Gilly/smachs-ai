import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/admin_provider.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AdminProvider>(builder: (ctx, prov, _) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Admin'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: prov.load,
            ),
          ],
        ),
        body: prov.loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: prov.load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Messages
                    if (prov.successMsg != null)
                      _Banner(message: prov.successMsg!, isError: false),
                    if (prov.error != null)
                      _Banner(message: prov.error!, isError: true),

                    // Health
                    _SectionLabel('System Health'),
                    _HealthCard(health: prov.health),
                    const SizedBox(height: 20),

                    // Actions
                    _SectionLabel('Actions'),
                    _ActionCard(
                      icon: Icons.delete_sweep_outlined,
                      title: 'Clear Cache',
                      subtitle: 'Clear Redis embedding & query cache',
                      loading: prov.clearingCache,
                      onTap: () async {
                        await prov.clearCache();
                        if (context.mounted && prov.successMsg != null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(prov.successMsg!), backgroundColor: Colors.green),
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    _ActionCard(
                      icon: Icons.restart_alt_outlined,
                      title: 'Reset Token Stats',
                      subtitle: 'Reset token optimization statistics',
                      loading: false,
                      onTap: prov.resetTokenStats,
                    ),
                    const SizedBox(height: 20),

                    // API Usage
                    _SectionLabel('API Usage'),
                    _UsageCard(usage: prov.usage),
                    const SizedBox(height: 20),

                    // Rate Limits
                    _SectionLabel('Rate Limits (Gemini Free Tier)'),
                    _RateLimitsCard(),
                  ],
                ),
              ),
      );
    });
  }
}

// ── Health Card ───────────────────────────────────────────────────────────────

class _HealthCard extends StatelessWidget {
  final Map<String, dynamic> health;
  const _HealthCard({required this.health});

  @override
  Widget build(BuildContext context) {
    final status = health['status'] ?? 'unknown';
    final mongo = health['mongodb'] ?? health['database'];
    final gemini = health['gemini'];
    final ok = status == 'ok' || status == 'healthy';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Icon(ok ? Icons.check_circle : Icons.error,
                    color: ok ? Colors.green : Colors.red, size: 20),
                const SizedBox(width: 8),
                Text('Backend: ${status.toUpperCase()}',
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: ok ? Colors.green : Colors.red)),
              ],
            ),
            const SizedBox(height: 12),
            _HealthRow(label: 'MongoDB', value: mongo?.toString() ?? '-'),
            const SizedBox(height: 6),
            if (gemini != null) _HealthRow(label: 'Gemini AI', value: gemini.toString()),
            const SizedBox(height: 6),
            _HealthRow(
              label: 'Backend URL',
              value: 'smachs-ai-backend.vercel.app',
            ),
          ],
        ),
      ),
    );
  }
}

class _HealthRow extends StatelessWidget {
  final String label;
  final String value;
  const _HealthRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Colors.white54)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ],
    );
  }
}

// ── Action Card ───────────────────────────────────────────────────────────────

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool loading;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.loading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: ListTile(
        leading: Icon(icon, color: cs.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: loading
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white38),
        onTap: loading ? null : onTap,
      ),
    );
  }
}

// ── Usage Card ────────────────────────────────────────────────────────────────

class _UsageCard extends StatelessWidget {
  final Map<String, dynamic> usage;
  const _UsageCard({required this.usage});

  @override
  Widget build(BuildContext context) {
    if (usage.isEmpty) {
      return const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No usage data', style: TextStyle(color: Colors.white54))));
    }

    final rateLimit = usage['rateLimit'] as Map<String, dynamic>? ?? {};
    final tokens = usage['tokenOptimization'] as Map<String, dynamic>? ?? {};

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (rateLimit.isNotEmpty) ...[
              const Text('Rate Limits', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              _HealthRow(label: 'Requests/min', value: '${rateLimit['requestsPerMinute'] ?? '-'}'),
              const SizedBox(height: 4),
              _HealthRow(label: 'Daily requests', value: '${rateLimit['requestsToday'] ?? '-'} / ${rateLimit['dailyLimit'] ?? '-'}'),
            ],
            if (tokens.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Token Optimization', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              _HealthRow(label: 'Tokens saved', value: '${tokens['tokensSaved'] ?? 0}'),
              const SizedBox(height: 4),
              _HealthRow(label: 'Reduction', value: '${tokens['reductionPercentage'] ?? 0}%'),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Rate Limits Card ──────────────────────────────────────────────────────────

class _RateLimitsCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: const [
            _HealthRow(label: 'Requests per minute', value: '15 RPM'),
            SizedBox(height: 6),
            _HealthRow(label: 'Tokens per minute', value: '1M TPM'),
            SizedBox(height: 6),
            _HealthRow(label: 'Requests per day', value: '200 RPD'),
          ],
        ),
      ),
    );
  }
}

// ── Banner ────────────────────────────────────────────────────────────────────

class _Banner extends StatelessWidget {
  final String message;
  final bool isError;
  const _Banner({required this.message, required this.isError});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: (isError ? Colors.red : Colors.green).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: isError ? Colors.red : Colors.green, width: 0.5),
      ),
      child: Row(
        children: [
          Icon(isError ? Icons.error_outline : Icons.check_circle_outline,
              color: isError ? Colors.red : Colors.green, size: 16),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}

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
