require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`FocusFlow server is running on port ${PORT}`);
  console.log(`API documentation: http://localhost:${PORT}/api-docs`);
});