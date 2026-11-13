// The data FocusFlow keeps ON THE DEVICE. Everything here works without internet or an account.

class Task {
  Task({required this.id, required this.title, this.done = false});

  final String id;
  String title;
  bool done;

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'done': done};

  factory Task.fromJson(Map<String, dynamic> json) => Task(
        id: json['id'].toString(),
        title: json['title'].toString(),
        done: json['done'] == true,
      );
}

/// One finished focus period.
class FocusSession {
  FocusSession({required this.date, required this.minutes});

  final String date; // ISO 8601 time when the session ended
  final int minutes;

  Map<String, dynamic> toJson() => {'date': date, 'minutes': minutes};

  factory FocusSession.fromJson(Map<String, dynamic> json) => FocusSession(
        date: json['date'].toString(),
        minutes: (json['minutes'] as num).toInt(),
      );
}

/// A backup as listed by the server (without its content).
class BackupInfo {
  BackupInfo({required this.id, required this.title, required this.fileSize, required this.createdAt});

  final int id;
  final String title;
  final int fileSize;
  final String createdAt;

  factory BackupInfo.fromJson(Map<String, dynamic> json) => BackupInfo(
        id: (json['id'] as num).toInt(),
        title: json['backup_title'].toString(),
        fileSize: (json['file_size'] as num?)?.toInt() ?? 0,
        createdAt: json['created_at'].toString(),
      );
}
