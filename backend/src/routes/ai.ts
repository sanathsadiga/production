/**
 * AI Predictions Routes
 * Endpoints for maintenance predictions and recommendations
 */

import { Router, Response } from 'express';
import { AuthRequest, auth } from '../middleware/auth';
import { mlAPI } from '../services/mlService';

export const aiRouter = Router();

/**
 * GET /ai/predictions
 * Get maintenance predictions for all machines or specific machine
 */
aiRouter.get('/predictions', auth, async (req: AuthRequest, res: Response) => {
  try {
    const machineId = req.query.machine_id ? parseInt(req.query.machine_id as string) : undefined;
    
    const result = await mlAPI.getMaintenancePredictions(machineId);
    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /ai/recommendations
 * Get maintenance recommendations based on predictions
 * Query params: publication_ids, start_date, end_date, location
 */
aiRouter.get('/recommendations', auth, async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      publication_ids: req.query.publication_ids as string,
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      location: req.query.location as string,
    };
    
    const result = await mlAPI.getMaintenanceRecommendations(filters);
    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ai/batch-analysis
 * Trigger daily batch analysis and model retraining
 * Should be called once per day via cron job
 */
aiRouter.post('/batch-analysis', auth, async (req: AuthRequest, res: Response) => {
  try {
    // Verify admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await mlAPI.runBatchAnalysis();
    res.json(result.data);
  } catch (error: any) {
    console.error('Error running batch analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /ai/model-info
 * Get ML model information
 */
aiRouter.get('/model-info', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await mlAPI.getModelInfo();
    res.json(result.data);
  } catch (error: any) {
    console.error('Error fetching model info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /ai/health
 * Health check for ML service
 */
aiRouter.get('/health', auth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await mlAPI.healthCheck();
    res.json(result.data);
  } catch (error: any) {
    console.error('ML Service health check failed:', error);
    res.status(503).json({ error: 'ML Service unavailable' });
  }
});

export default aiRouter;
