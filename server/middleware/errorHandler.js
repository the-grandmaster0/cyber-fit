
export function errorHandler(err, req, res, next) {
  // Log full error details for debugging
  console.error('Error:', err);

  // Determine status code
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Create safe error response
  let errorMessage = 'Something went wrong.';

  if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    errorMessage = err.message || errorMessage;
  }

  // Send safe response to client
  res.status(statusCode).json({
    error: errorMessage
  });
}
