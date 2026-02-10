import express from 'express';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://production.projectdesigners.cloud',
  'https://www.production.projectdesigners.cloud',
];

/**
 * CORS middleware - handle cross-origin requests
 */
export const corsMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};