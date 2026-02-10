import express from 'express';

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.path; // Use originalUrl to get full path
    const userAgent = req.get('user-agent') || 'unknown';

    // Log based on status code
    const logLevel = statusCode >= 400 ? '❌' : '✓';
    console.log(
      `${logLevel} [${method}] ${path} - ${statusCode} (${duration}ms) - ${userAgent.substring(0, 50)}`
    );

    return originalSend.call(this, data);
  };

  next();
};