const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || undefined;

  // PostgreSQL Error Code Mapping
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Duplicate record constraint violation';
  } else if (err.code === '23503') {
    statusCode = 409;
    message = 'Referenced resource constraint violation';
  } else if (err.code === '23514') {
    statusCode = 400;
    message = 'Database constraint violation';
  }

  // Mongoose Validation Error Mapping
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  // Server-side logging for debugging
  if (statusCode >= 500) {
    console.error('Unhandled Server Error:', err);
    message = 'Internal server error';
  }

  const responsePayload = { message };
  if (code) {
    responsePayload.code = code;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
