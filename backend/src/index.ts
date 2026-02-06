import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { testConnection } from './db';

// Import routes
import authRoutes from './routes/auth';
import masterRoutes from './routes/master';
import productionRoutes from './routes/production';

dotenv.config();

const app: Express = express();
const PORT = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MMCL Production API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/production', productionRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
