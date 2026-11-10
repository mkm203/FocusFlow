const db = require('../config/db');

// Every query includes user_id: a user can only ever see or change their OWN backups.
class BackupModel {
  // List without the (possibly large) payload
  static async getByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT id, backup_title, file_size, created_at, updated_at FROM backups WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [userId]
    );
    return rows;
  }

  static async getById(id, userId) {
    const [rows] = await db.execute('SELECT * FROM backups WHERE id = ? AND user_id = ?', [id, userId]);
    return rows[0];
  }

  static async create(userId, title, payloadText) {
    const [result] = await db.execute(
      'INSERT INTO backups (user_id, backup_title, data_payload, file_size) VALUES (?, ?, ?, ?)',
      [userId, title, payloadText, Buffer.byteLength(payloadText)]
    );
    return BackupModel.getById(result.insertId, userId);
  }

  static async update(id, userId, title, payloadText) {
    const [result] = await db.execute(
      'UPDATE backups SET backup_title = ?, data_payload = ?, file_size = ? WHERE id = ? AND user_id = ?',
      [title, payloadText, Buffer.byteLength(payloadText), id, userId]
    );
    if (result.affectedRows === 0) return null;
    return BackupModel.getById(id, userId);
  }

  static async delete(id, userId) {
    const [result] = await db.execute('DELETE FROM backups WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
  }
}

module.exports = BackupModel;