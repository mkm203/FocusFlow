import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';
import 'models.dart';

enum TimerMode { focus, rest }

/// All the app's data and logic. It is saved on the device (SharedPreferences),
/// so the app works 100% offline. The cloud is only used from the Backup tab.
class AppState extends ChangeNotifier {
  AppState(this._prefs) {
    _load();
  }

  final SharedPreferences _prefs;

  // ----- local data -----
  final List<Task> tasks = [];
  final List<FocusSession> sessions = [];
  int focusMinutes = 25;
  int restMinutes = 5;

  // ----- timer (not saved: it only lives while the app is open) -----
  TimerMode mode = TimerMode.focus;
  late int secondsLeft = focusMinutes * 60;
  bool running = false;
  Timer? _ticker;

  // ----- optional cloud account -----
  String? token;
  String? email;
  String apiUrl = defaultApiUrl();

  /// Android emulators see your PC as 10.0.2.2. Everything else (web, iOS simulator, desktop) uses localhost.
  /// On a real phone, type your PC's Wi-Fi address in the Backup tab (for example http://192.168.1.20:5001).
  static String defaultApiUrl() {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:5001';
    return 'http://localhost:5001';
  }

  ApiService get api => ApiService(baseUrl: apiUrl, token: token);
  bool get signedIn => token != null;

  // ---------- load / save ----------
  void _load() {
    focusMinutes = _prefs.getInt('focusMinutes') ?? 25;
    restMinutes = _prefs.getInt('restMinutes') ?? 5;
    secondsLeft = focusMinutes * 60;
    token = _prefs.getString('token');
    email = _prefs.getString('email');
    apiUrl = _prefs.getString('apiUrl') ?? defaultApiUrl();
    _readLists(jsonDecode(_prefs.getString('data') ?? '{}') as Map<String, dynamic>);
  }

  void _readLists(Map<String, dynamic> data) {
    tasks
      ..clear()
      ..addAll((data['tasks'] as List<dynamic>? ?? []).map((e) => Task.fromJson(e as Map<String, dynamic>)));
    sessions
      ..clear()
      ..addAll((data['sessions'] as List<dynamic>? ?? []).map((e) => FocusSession.fromJson(e as Map<String, dynamic>)));
  }

  Future<void> _save() async {
    await _prefs.setString('data', jsonEncode({'tasks': tasks.map((t) => t.toJson()).toList(), 'sessions': sessions.map((s) => s.toJson()).toList()}));
    await _prefs.setInt('focusMinutes', focusMinutes);
    await _prefs.setInt('restMinutes', restMinutes);
  }

  // ---------- tasks ----------
  void addTask(String title) {
    final clean = title.trim();
    if (clean.isEmpty) return;
    tasks.insert(0, Task(id: DateTime.now().microsecondsSinceEpoch.toString(), title: clean));
    _save();
    notifyListeners();
  }

  void toggleTask(Task task) {
    task.done = !task.done;
    _save();
    notifyListeners();
  }

  void deleteTask(Task task) {
    tasks.remove(task);
    _save();
    notifyListeners();
  }

  // ---------- timer ----------
  int get todayMinutes {
    final now = DateTime.now();
    return sessions.where((s) {
      final d = DateTime.tryParse(s.date)?.toLocal();
      return d != null && d.year == now.year && d.month == now.month && d.day == now.day;
    }).fold(0, (sum, s) => sum + s.minutes);
  }

  int get totalMinutes => sessions.fold(0, (sum, s) => sum + s.minutes);

  void startPause() {
    if (running) {
      _ticker?.cancel();
      running = false;
    } else {
      running = true;
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    }
    notifyListeners();
  }

  void _tick() {
    if (secondsLeft > 0) {
      secondsLeft--;
    }
    if (secondsLeft == 0) {
      if (mode == TimerMode.focus) {
        sessions.add(FocusSession(date: DateTime.now().toUtc().toIso8601String(), minutes: focusMinutes));
        _save();
        mode = TimerMode.rest;
        secondsLeft = restMinutes * 60;
      } else {
        mode = TimerMode.focus;
        secondsLeft = focusMinutes * 60;
      }
    }
    notifyListeners();
  }

  void resetTimer() {
    _ticker?.cancel();
    running = false;
    mode = TimerMode.focus;
    secondsLeft = focusMinutes * 60;
    notifyListeners();
  }

  void setDurations(int focus, int rest) {
    focusMinutes = focus;
    restMinutes = rest;
    _save();
    resetTimer();
  }

  // ---------- cloud account ----------
  Future<void> setApiUrl(String url) async {
    apiUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    await _prefs.setString('apiUrl', apiUrl);
    notifyListeners();
  }

  Future<void> signUp(String mail, String password) async {
    await api.register(mail, password);
    await signIn(mail, password);
  }

  Future<void> signIn(String mail, String password) async {
    token = await api.login(mail, password);
    email = mail;
    await _prefs.setString('token', token!);
    await _prefs.setString('email', mail);
    notifyListeners();
  }

  Future<void> signOut() async {
    token = null;
    email = null;
    await _prefs.remove('token');
    await _prefs.remove('email');
    notifyListeners();
  }

  // ---------- backup and restore ----------
  /// The whole app state as JSON, ready to be sent to the server.
  Map<String, dynamic> toBackupJson() => {
        'version': 1,
        'settings': {'focusMinutes': focusMinutes, 'restMinutes': restMinutes},
        'tasks': tasks.map((t) => t.toJson()).toList(),
        'sessions': sessions.map((s) => s.toJson()).toList(),
      };

  /// Replaces the data on this device with a downloaded backup.
  Future<void> restoreFrom(Map<String, dynamic> data) async {
    final settings = (data['settings'] as Map<String, dynamic>?) ?? {};
    focusMinutes = (settings['focusMinutes'] as num?)?.toInt() ?? focusMinutes;
    restMinutes = (settings['restMinutes'] as num?)?.toInt() ?? restMinutes;
    _readLists(data);
    await _save();
    resetTimer();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }
}
