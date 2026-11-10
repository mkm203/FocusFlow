// OpenAPI 3.0 description of the FocusFlow cloud backup API (Swagger UI at /api-docs).
const err = d => ({ description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const secured = [{ bearerAuth: [] }];
const backupBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BackupRequest' } } } };
const unauth = err('Missing, invalid or expired token');

module.exports = {
  openapi: '3.0.3',
  info: { title: 'FocusFlow Cloud Backup API', version: '1.0.0',
    description: 'OPTIONAL cloud backup for the FocusFlow Flutter app. The app works fully offline; these endpoints are only for users who create a cloud account.' },
  servers: [{ url: 'http://localhost:5001', description: 'Local development' }],
  tags: [{ name: 'Auth' }, { name: 'Backups' }, { name: 'System' }],
  paths: {
    '/api/health': { get: { tags: ['System'], summary: 'Server status (no token needed)', responses: { 200: { description: 'Server is running' } } } },
    '/api/auth/register': { post: { tags: ['Auth'], summary: 'Create an optional cloud account (public)',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } } },
      responses: { 201: { description: 'Account created' }, 400: err('Invalid email/password or email already registered') } } },
    '/api/auth/login': { post: { tags: ['Auth'], summary: 'Log in and receive a JWT (public)',
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } } },
      responses: { 200: { description: 'Login successful, token valid 1 day' }, 400: err('Missing credentials'), 401: err('Invalid email or password') } } },
    '/api/backups': {
      get: { tags: ['Backups'], summary: 'List my backups (without payloads)', security: secured, responses: { 200: { description: 'List of backups' }, 401: unauth } },
      post: { tags: ['Backups'], summary: 'Create a backup snapshot', security: secured, requestBody: backupBody,
        responses: { 201: { description: 'Backup created' }, 400: err('Invalid JSON, missing field or payload over 100 KB'), 401: unauth } } },
    '/api/backups/{id}': {
      get: { tags: ['Backups'], summary: 'Get one backup with its payload', security: secured, parameters: [idParam],
        responses: { 200: { description: 'The backup' }, 400: err('Invalid id'), 401: unauth, 404: err('Not found (or belongs to another user)') } },
      put: { tags: ['Backups'], summary: 'Replace a backup', security: secured, parameters: [idParam], requestBody: backupBody,
        responses: { 200: { description: 'Backup updated' }, 400: err('Invalid input'), 401: unauth, 404: err('Not found') } },
      delete: { tags: ['Backups'], summary: 'Delete a backup', security: secured, parameters: [idParam],
        responses: { 200: { description: 'Backup deleted' }, 401: unauth, 404: err('Not found') } } },
    '/api/backups/{id}/restore': {
      get: { tags: ['Backups'], summary: 'Restore: return only the saved app state', security: secured, parameters: [idParam],
        responses: { 200: { description: 'The saved state as JSON' }, 401: unauth, 404: err('Not found') } } }
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Credentials: { type: 'object', required: ['email', 'password'], properties: {
        email: { type: 'string', example: 'student@focusflow.cm' }, password: { type: 'string', minLength: 8, example: 'Password123' } } },
      BackupRequest: { type: 'object', required: ['backup_title', 'data_payload'], properties: {
        backup_title: { type: 'string', example: 'v1.0-initial-state-backup' },
        data_payload: { type: 'object', description: 'The app state as JSON (an object, array, or a JSON string). 100 KB maximum.',
          example: { settings: { theme: 'dark', notifications: true } } } } },
      Error: { type: 'object', properties: { success: { type: 'boolean', example: false }, message: { type: 'string' } } }
    }
  }
};