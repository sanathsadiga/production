import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import masterRoutes from './routes/master';
import productionRoutes from './routes/production';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004;

// ✅ CRITICAL: Middleware MUST come before routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: '✅ Backend running', port: PORT });
});

// ✅ CRITICAL: Routes MUST be mounted with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/production', productionRoutes);

// 404 handler - MUST be AFTER all routes
app.use((req: Request, res: Response) => {
  console.log(`❌ 404 Not Found: [${req.method}] ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ API Base URL: http://localhost:${PORT}/api`);
  console.log(`✅ Auth routes: http://localhost:${PORT}/api/auth`);
});

export default app;
