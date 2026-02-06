import express, { Request, Response } from 'express';
import { PUBLICATIONS, MACHINES, DOWNTIME_REASONS, NEWSPRINT_TYPES, LOCATIONS } from '../constants';
import { pool } from '../db';
const router = express.Router();

// Get all publications
router.get('/publications', (req: Request, res: Response): void => {
  try {
    res.json({
      success: true,
      data: PUBLICATIONS,
    });
  } catch (error) {
    console.error('Error fetching publications:', error);
    res.status(500).json({ error: 'Failed to fetch publications' });
  }
});

// Get all machines
router.get('/machines', (req: Request, res: Response): void => {
  try {
    res.json({
      success: true,
      data: MACHINES,
    });
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Get all downtime reasons
router.get('/downtime-reasons', (req: Request, res: Response): void => {
  try {
    // Map 'reasons' to 'reason' for frontend compatibility
    const formattedReasons = DOWNTIME_REASONS.map(dt => ({
      id: dt.id,
      reason: dt.reasons,
      code: dt.code,
    }));
    
    res.json({
      success: true,
      data: formattedReasons,
    });
  } catch (error) {
    console.error('Error fetching downtime reasons:', error);
    res.status(500).json({ error: 'Failed to fetch downtime reasons' });
  }
});

// Get all newsprint types
router.get('/newsprint-types', (req: Request, res: Response): void => {
  try {
    res.json({
      success: true,
      data: NEWSPRINT_TYPES,
    });
  } catch (error) {
    console.error('Error fetching newsprint types:', error);
    res.status(500).json({ error: 'Failed to fetch newsprint types' });
  }
});

// Get all locations
router.get('/locations', async (req: Request, res: Response): Promise<void> => {
  try {
    const conn = await pool.getConnection();
    const [rows]: any = await conn.query(
      'SELECT DISTINCT location FROM users WHERE location IS NOT NULL AND location != "" ORDER BY location'
    );
    conn.release();

    const locations = rows.map((row: any) => row.location);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

export default router;
