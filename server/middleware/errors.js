export class AppError extends Error {
  constructor(status, code, fields) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return;
  const bodyTooLarge = error.type === 'entity.too.large';
  const malformedJson = error.type === 'entity.parse.failed';
  const duplicate = error.code === 11000;
  const status = bodyTooLarge ? 413 : malformedJson ? 400 : duplicate ? 409 : error.status || 500;
  const code = bodyTooLarge
    ? 'PAYLOAD_TOO_LARGE'
    : malformedJson
      ? 'INVALID_JSON'
      : duplicate
        ? 'CONFLICT'
        : error.code || 'SERVER_ERROR';
  if (status >= 500) console.error(JSON.stringify({ requestId: req.id, code: 'SERVER_ERROR' }));
  res.status(status).json({
    error: { code: status >= 500 ? 'SERVER_ERROR' : code, fields: error.fields },
    requestId: req.id,
  });
}
