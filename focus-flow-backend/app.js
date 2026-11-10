// The Express app (no listen), so tests can import it.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const authRoutes = require('./routes/authRoutes');
const backupRoutes = require('./routes/backupRoutes');
const errorHandler = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Add it to your .env file.');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' })); // bigger bodies are refused with 400

// Open route: no token needed. The FocusFlow app works 100% offline and never depends on this server.
app.get('/api/health', (req, res) =>
  res.status(200).json({ status: 'success', message: 'FocusFlow backend connected to MariaDB is running.' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/api-docs.json', (req, res) => res.json(openapi));

app.use('/api/auth', authRoutes);
app.use('/api/backups', backupRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use(errorHandler);

module.exports = app;