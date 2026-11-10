// Reject ids that are not positive integers
function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'id must be a positive integer' });
  }
  next();
}

// Check the body of POST and PUT
function validateBackup(req, res, next) {
  const { backup_title, data_payload, file_size } = req.body || {};
  const errors = [];

  if (typeof backup_title !== 'string' || backup_title.trim() === '' || backup_title.length > 255) {
    errors.push('backup_title is required (text, max 255 characters)');
  }
  if (typeof data_payload !== 'string' || data_payload.trim() === '') {
    errors.push('data_payload is required (text or a JSON string)');
  }
  if (file_size !== undefined && (!Number.isInteger(file_size) || file_size < 0)) {
    errors.push('file_size must be an integer of 0 or more');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
}

// Check the optional query parameters of GET /backups (limit and offset)
function validateQuery(req, res, next) {
  const { limit, offset } = req.query;
  const errors = [];

  if (limit !== undefined && !(/^\d+$/.test(limit) && Number(limit) >= 1 && Number(limit) <= 100)) {
    errors.push('limit must be an integer between 1 and 100');
  }
  if (offset !== undefined && !/^\d+$/.test(offset)) {
    errors.push('offset must be an integer of 0 or more');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Invalid query parameters', errors });
  }
  next();
}

module.exports = { validateId, validateBackup, validateQuery };