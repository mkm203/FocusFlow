import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'models.dart';

class ApiException implements Exception {
  ApiException(this.message, [this.status = 0]);

  final String message;
  final int status;

  @override
  String toString() => message;
}

/// Talks to the FocusFlow backend (Express + MariaDB, port 5001).
/// Only the optional cloud backup uses it: the rest of the app never calls this class.
class ApiService {
  ApiService({required this.baseUrl, this.token});

  final String baseUrl;
  final String? token;

  Uri _uri(String path) => Uri.parse('$baseUrl/api$path');

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  // Sends the request and returns the JSON body. Server errors ({success:false, message}) become ApiException.
  Future<Map<String, dynamic>> _send(Future<http.Response> Function() call) async {
    http.Response response;
    try {
      response = await call().timeout(const Duration(seconds: 12));
    } on TimeoutException {
      throw ApiException('The server did not answer. Is the backend running?');
    } catch (_) {
      throw ApiException('Cannot reach the server at $baseUrl. Check the address, that "npm run dev" is running and that MySQL is started in XAMPP.');
    }

    Map<String, dynamic> body = {};
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) body = decoded;
    } catch (_) {
      // no JSON in the answer
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(body['message']?.toString() ?? 'Request failed (${response.statusCode})', response.statusCode);
    }
    return body;
  }

  Future<void> register(String email, String password) async {
    await _send(() => http.post(_uri('/auth/register'), headers: _headers, body: jsonEncode({'email': email, 'password': password})));
  }

  /// Returns the JWT token.
  Future<String> login(String email, String password) async {
    final body = await _send(() => http.post(_uri('/auth/login'), headers: _headers, body: jsonEncode({'email': email, 'password': password})));
    return body['token'].toString();
  }

  Future<List<BackupInfo>> listBackups() async {
    final body = await _send(() => http.get(_uri('/backups'), headers: _headers));
    final list = (body['data'] as List<dynamic>? ?? []);
    return list.map((e) => BackupInfo.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createBackup(String title, Map<String, dynamic> state) async {
    await _send(() => http.post(_uri('/backups'), headers: _headers, body: jsonEncode({'backup_title': title, 'data_payload': state})));
  }

  /// Returns the saved app state.
  Future<Map<String, dynamic>> restoreBackup(int id) async {
    final body = await _send(() => http.get(_uri('/backups/$id/restore'), headers: _headers));
    return body['data'] as Map<String, dynamic>;
  }

  Future<void> deleteBackup(int id) async {
    await _send(() => http.delete(_uri('/backups/$id'), headers: _headers));
  }
}
