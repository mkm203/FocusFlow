import 'package:flutter/material.dart';

import '../api_service.dart';
import '../app_state.dart';
import '../models.dart';

/// OPTIONAL cloud backup. Nothing else in the app depends on this screen or on the server.
class BackupTab extends StatefulWidget {
  const BackupTab({super.key, required this.state});

  final AppState state;

  @override
  State<BackupTab> createState() => _BackupTabState();
}

class _BackupTabState extends State<BackupTab> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  late final TextEditingController _server = TextEditingController(text: widget.state.apiUrl);

  List<BackupInfo> _backups = [];
  bool _busy = false;
  String _error = '';
  String _info = '';

  AppState get state => widget.state;

  @override
  void initState() {
    super.initState();
    if (state.signedIn) _refresh();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _server.dispose();
    super.dispose();
  }

  // Runs a server action with a loading state and one place for error messages.
  Future<void> _run(Future<void> Function() action, {String done = ''}) async {
    setState(() {
      _busy = true;
      _error = '';
      _info = '';
    });
    try {
      await state.setApiUrl(_server.text);
      await action();
      if (!mounted) return;
      setState(() => _info = done);
    } on ApiException catch (e) {
      if (e.status == 401 && state.signedIn) await state.signOut(); // the login expired
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refresh() async {
    try {
      final list = await state.api.listBackups();
      if (mounted) setState(() => _backups = list);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.status == 401) await state.signOut();
      setState(() => _error = e.message);
    }
  }

  bool _validCredentials() {
    final mail = _email.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(mail)) {
      setState(() => _error = 'Enter a valid email address.');
      return false;
    }
    if (_password.text.length < 8) {
      setState(() => _error = 'The password needs at least 8 characters.');
      return false;
    }
    return true;
  }

  Future<void> _backupNow() async {
    final now = DateTime.now();
    final title = 'Backup ${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')} '
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    await _run(() async {
      await state.api.createBackup(title, state.toBackupJson());
      await _refresh();
    }, done: 'Backup saved to the cloud.');
  }

  Future<void> _restore(BackupInfo backup) async {
    final yes = await _confirm('Restore "${backup.title}"?', 'This REPLACES the tasks, sessions and settings on this device.');
    if (yes != true) return;
    await _run(() async {
      final data = await state.api.restoreBackup(backup.id);
      await state.restoreFrom(data);
    }, done: 'Backup restored on this device.');
  }

  Future<void> _delete(BackupInfo backup) async {
    final yes = await _confirm('Delete "${backup.title}"?', 'It will be removed from the cloud. Your data on this device is not affected.');
    if (yes != true) return;
    await _run(() async {
      await state.api.deleteBackup(backup.id);
      await _refresh();
    }, done: 'Backup deleted.');
  }

  Future<bool?> _confirm(String title, String text) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(text),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: state,
      builder: (context, _) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Card(
              child: Padding(
                padding: EdgeInsets.all(14),
                child: Text('FocusFlow works fully offline. A cloud account is optional: use it only to back up your data or move it to another device.'),
              ),
            ),
            const SizedBox(height: 12),
            if (_error.isNotEmpty) _Message(text: _error, isError: true),
            if (_info.isNotEmpty) _Message(text: _info, isError: false),
            if (!state.signedIn) ..._signInForm() else ..._backupList(),
            const SizedBox(height: 12),
            ExpansionTile(
              title: const Text('Server address'),
              subtitle: const Text('Change only if the backup server is elsewhere'),
              children: [
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: TextField(
                    controller: _server,
                    keyboardType: TextInputType.url,
                    decoration: const InputDecoration(border: OutlineInputBorder(), helperText: 'Phone on Wi-Fi: http://<your PC IP>:5001'),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  List<Widget> _signInForm() => [
        TextField(controller: _email, keyboardType: TextInputType.emailAddress, autocorrect: false, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password (8+ characters)', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton(
                onPressed: _busy
                    ? null
                    : () {
                        if (_validCredentials()) _run(() => state.signIn(_email.text.trim(), _password.text).then((_) => _refresh()), done: 'Logged in.');
                      },
                child: const Text('Log in'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton(
                onPressed: _busy
                    ? null
                    : () {
                        if (_validCredentials()) _run(() => state.signUp(_email.text.trim(), _password.text).then((_) => _refresh()), done: 'Account created.');
                      },
                child: const Text('Create account'),
              ),
            ),
          ],
        ),
        if (_busy) const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
      ];

  List<Widget> _backupList() => [
        Row(
          children: [
            Expanded(child: Text('Signed in as ${state.email ?? ''}', overflow: TextOverflow.ellipsis)),
            TextButton(onPressed: _busy ? null : () async { await state.signOut(); if (mounted) setState(() => _backups = []); }, child: const Text('Sign out')),
          ],
        ),
        const SizedBox(height: 8),
        FilledButton.icon(onPressed: _busy ? null : _backupNow, icon: const Icon(Icons.cloud_upload), label: const Text('Back up now')),
        if (_busy) const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
        const SizedBox(height: 16),
        Text('Your backups', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_backups.isEmpty) const Text('No backups yet.'),
        for (final b in _backups)
          Card(
            child: ListTile(
              title: Text(b.title),
              subtitle: Text('${b.fileSize} bytes'),
              trailing: Wrap(
                children: [
                  IconButton(tooltip: 'Restore', onPressed: _busy ? null : () => _restore(b), icon: const Icon(Icons.restore)),
                  IconButton(tooltip: 'Delete', onPressed: _busy ? null : () => _delete(b), icon: const Icon(Icons.delete_outline)),
                ],
              ),
            ),
          ),
      ];
}

class _Message extends StatelessWidget {
  const _Message({required this.text, required this.isError});

  final String text;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: isError ? scheme.errorContainer : scheme.secondaryContainer, borderRadius: BorderRadius.circular(10)),
      child: Text(text),
    );
  }
}
