const express = require('express');
const BackupModel = require('../models/backupModel');
const verifyToken = require('../middleware/authMiddleware');
const HttpError = require('../utils/HttpError');
const v = require('../utils/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const MAX_PAYLOAD_BYTES = 100 * 1024; // 100 KB

router.use(verifyToken); // every cloud route needs a valid token

// Accepts the app state as a JSON object/array OR as a JSON string, returns it as clean JSON text
function readPayload(body) {
  const title = v.text(body.backup_title, 'backup_title', 1, 255);
  let state = body.data_payload;
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { throw new HttpError(400, 'data_payload must be valid JSON.'); }
  }
  if (state === null || typeof state !== 'object') throw new HttpError(400, 'data_payload must be a JSON object or array.');
  const text = JSON.stringify(state);
  if (Buffer.byteLength(text) > MAX_PAYLOAD_BYTES) throw new HttpError(400, 'data_payload is too large (100 KB maximum).');
  return { title, text };
}

// What the app receives: the stored JSON text is turned back into a real object
const present = row => ({
  id: row.id, backup_title: row.backup_title, file_size: row.file_size,
  created_at: row.created_at, updated_at: row.updated_at, data_payload: JSON.parse(row.data_payload)
});

// GET /api/backups -> list of MY backups (no payloads)
router.get('/', asyncHandler(async (req, res) => {
  const backups = await BackupModel.getByUserId(req.user.id);
  res.status(200).json({ success: true, count: backups.length, data: backups });
}));

// POST /api/backups -> save a new snapshot
router.post('/', asyncHandler(async (req, res) => {
  const { title, text } = readPayload(req.body || {});
  const row = await BackupModel.create(req.user.id, title, text);
  res.status(201).json({ success: true, message: 'Backup created successfully', data: present(row) });
}));

// GET /api/backups/:id -> one backup with its payload
router.get('/:id', asyncHandler(async (req, res) => {
  const row = await BackupModel.getById(v.id(req.params.id), req.user.id);
  if (!row) throw new HttpError(404, 'Backup record not found');
  res.status(200).json({ success: true, data: present(row) });
}));

// GET /api/backups/:id/restore -> only the saved app state, ready to load into the app
router.get('/:id/restore', asyncHandler(async (req, res) => {
  const row = await BackupModel.getById(v.id(req.params.id), req.user.id);
  if (!row) throw new HttpError(404, 'Backup record not found');
  res.status(200).json({ success: true, message: 'Backup restored', backup_title: row.backup_title, data: JSON.parse(row.data_payload) });
}));

// PUT /api/backups/:id -> replace a snapshot
router.put('/:id', asyncHandler(async (req, res) => {
  const id = v.id(req.params.id);
  const { title, text } = readPayload(req.body || {});
  const row = await BackupModel.update(id, req.user.id, title, text);
  if (!row) throw new HttpError(404, 'Backup record not found for update');
  res.status(200).json({ success: true, message: 'Backup updated successfully', data: present(row) });
}));

// DELETE /api/backups/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!(await BackupModel.delete(v.id(req.params.id), req.user.id)))
    throw new HttpError(404, 'Backup record not found for deletion');
  res.status(200).json({ success: true, message: 'Backup deleted successfully' });
}));

module.exports = router;