import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} was not found.`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed.',
      code: 'VALIDATION_ERROR',
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {})
    });
  }

  if (error && error.code === 'P2002') {
    return res.status(409).json({
      error: 'Unique constraint violation.',
      code: 'CONFLICT',
      details: error.meta
    });
  }

  console.error(error);

  return res.status(500).json({
    error: 'Internal server error.',
    code: 'INTERNAL_SERVER_ERROR'
  });
}
