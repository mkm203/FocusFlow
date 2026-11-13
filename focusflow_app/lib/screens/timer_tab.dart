import 'package:flutter/material.dart';

import '../app_state.dart';

class TimerTab extends StatelessWidget {
  const TimerTab({super.key, required this.state});

  final AppState state;

  String _clock(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: state,
      builder: (context, _) {
        final total = (state.mode == TimerMode.focus ? state.focusMinutes : state.restMinutes) * 60;
        final progress = total == 0 ? 0.0 : 1 - state.secondsLeft / total;
        final scheme = Theme.of(context).colorScheme;
        final isFocus = state.mode == TimerMode.focus;

        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: Chip(
                avatar: Icon(isFocus ? Icons.bolt : Icons.coffee, size: 18),
                label: Text(isFocus ? 'Focus time' : 'Break time'),
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: SizedBox(
                width: 240,
                height: 240,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.expand(
                      child: CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 12,
                        backgroundColor: scheme.surfaceContainerHighest,
                        color: isFocus ? scheme.primary : scheme.tertiary,
                      ),
                    ),
                    Text(_clock(state.secondsLeft), style: Theme.of(context).textTheme.displayMedium?.copyWith(fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FilledButton.icon(
                  onPressed: state.startPause,
                  icon: Icon(state.running ? Icons.pause : Icons.play_arrow),
                  label: Text(state.running ? 'Pause' : 'Start'),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(onPressed: state.resetTimer, icon: const Icon(Icons.restart_alt), label: const Text('Reset')),
              ],
            ),
            const SizedBox(height: 28),
            Row(
              children: [
                Expanded(child: _Stat(label: 'Today', value: '${state.todayMinutes} min')),
                const SizedBox(width: 12),
                Expanded(child: _Stat(label: 'All time', value: '${state.totalMinutes} min')),
                const SizedBox(width: 12),
                Expanded(child: _Stat(label: 'Sessions', value: '${state.sessions.length}')),
              ],
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: state.running ? null : () => _editDurations(context),
              icon: const Icon(Icons.tune),
              label: Text('Durations: ${state.focusMinutes} min focus / ${state.restMinutes} min break'),
            ),
            const SizedBox(height: 4),
            const Center(child: Text('Works fully offline: no account needed.', style: TextStyle(fontSize: 12))),
          ],
        );
      },
    );
  }

  Future<void> _editDurations(BuildContext context) async {
    final focus = TextEditingController(text: '${state.focusMinutes}');
    final rest = TextEditingController(text: '${state.restMinutes}');
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Timer durations'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: focus, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Focus (minutes)')),
            const SizedBox(height: 8),
            TextField(controller: rest, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Break (minutes)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
        ],
      ),
    );
    if (saved == true) {
      final f = int.tryParse(focus.text.trim());
      final r = int.tryParse(rest.text.trim());
      if (f != null && r != null && f >= 1 && f <= 180 && r >= 1 && r <= 60) {
        state.setDurations(f, r);
      }
    }
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
