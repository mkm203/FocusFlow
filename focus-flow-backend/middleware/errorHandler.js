// Every error leaves the API in the same JSON shape.
module.exports = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {        // FIX: broken JSON -> 400, not 500
    status = 400;
    message = 'Malformed JSON in the request body.';
  } else if (err.type === 'entity.too.large') {
    status = 400;
    message = 'Request body is too large.';
  } else if (status === 500) {
    console.error(err.stack || err.message);        // the real error stays in your terminal
    message = 'Internal Server Error';              // FIX: nothing internal is sent to the client
  }
  res.status(status).json({ success: false, message });
};