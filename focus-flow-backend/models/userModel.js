const db = require('../config/db');

class UserModel {
  // Find a cloud user by email (? placeholder prevents SQL injection)
  static async getByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM cloud_users WHERE email = ?', [email]);
    return rows[0];
  }

  // Register a new cloud user (password is already hashed)
  static async create(email, hashedPassword) {
    const [result] = await db.execute('INSERT INTO cloud_users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    return { id: result.insertId, email };
  }
}

module.exports = UserModel;