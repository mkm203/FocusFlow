// Creates a database and its tables from sql/schema.sql (tests use it for the test database).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase(dbName = process.env.DB_NAME) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    multipleStatements: true
  });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8')
    .replace(/focus_flow_db/g, dbName);
  await conn.query(sql);
  await conn.end();
}
module.exports = initDatabase;

if (require.main === module) {
  initDatabase()
    .then(() => console.log(`Database "${process.env.DB_NAME}" is ready.`))
    .catch(e => { console.error('Could not create the database:', e.message); process.exit(1); });
}