import express from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: ApiError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error('❌ Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    code: err.code,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>
) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};