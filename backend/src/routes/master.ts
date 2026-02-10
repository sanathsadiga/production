import express, { Request, Response } from 'express';
import { pool } from '../db';
import { auth } from '../middleware/auth';

const router = express.Router();

// ============================================
// PUBLICATIONS - CRUD OPERATIONS
// ============================================

/**
 * GET /master/publications
 * Get publications from MySQL database, optionally filtered by type
 */
router.get('/publications', auth, async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const conn = await pool.getConnection();

    let query = 'SELECT id, name, code, publication_type as type, location FROM publications WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND publication_type = ?';
      params.push(type);
    }

    query += ' ORDER BY name ASC';

    const [rows]: any = await conn.query(query, params);
    conn.release();

    res.json({ data: rows || [] });
  } catch (error: any) {
    console.error('Error fetching publications:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /master/publications
 * Create a new publication in MySQL database
 */
router.post('/publications', auth, async (req: Request, res: Response) => {
  try {
    const { name, code, type, location } = req.body;

    if (!name || !code || !type || !location) {
      return res.status(400).json({ error: 'Missing required fields: name, code, type, location' });
    }

    const conn = await pool.getConnection();

    const [result]: any = await conn.query(
      'INSERT INTO publications (name, code, publication_type, location) VALUES (?, ?, ?, ?)',
      [name, code, type, location]
    );

    conn.release();

    res.status(201).json({
      id: result.insertId,
      name,
      code,
      type,
      location,
      message: 'Publication created successfully',
    });
  } catch (error: any) {
    console.error('Error creating publication:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /master/publications/:id
 * Update an existing publication in MySQL database
 */
router.put('/publications/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, type, location } = req.body;

    const conn = await pool.getConnection();

    await conn.query(
      'UPDATE publications SET name = ?, code = ?, publication_type = ?, location = ? WHERE id = ?',
      [name, code, type, location, parseInt(id)]
    );

    conn.release();

    res.json({ message: 'Publication updated successfully' });
  } catch (error: any) {
    console.error('Error updating publication:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /master/publications/:id
 * Delete a publication from MySQL database
 */
router.delete('/publications/:id', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();

    await conn.query('DELETE FROM publications WHERE id = ?', [parseInt(id)]);
    conn.release();

    res.json({ message: 'Publication deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting publication:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MASTER DATA - READ ONLY
// ============================================

/**
 * GET /master/machines
 * Get all machines from database
 */
router.get('/machines', auth, async (req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [rows]: any = await conn.query('SELECT id, name, code FROM machines ORDER BY name ASC');
    conn.release();

    res.json({ data: rows || [] });
  } catch (error: any) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /master/downtime-reasons
 * Get all downtime reasons from database
 */
router.get('/downtime-reasons', auth, async (req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [rows]: any = await conn.query('SELECT id, name, reason, category FROM downtime_reasons ORDER BY name ASC');
    conn.release();

    res.json({ data: rows || [] });
  } catch (error: any) {
    console.error('Error fetching downtime reasons:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /master/newsprint-types
 * Get all newsprint types from database
 */
router.get('/newsprint-types', auth, async (req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [rows]: any = await conn.query('SELECT id, name, code, gsm FROM newsprint_types ORDER BY name ASC');
    conn.release();

    res.json({ data: rows || [] });
  } catch (error: any) {
    console.error('Error fetching newsprint types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /master/locations
 * Get all unique locations from users table (excluding admins)
 * ✅ CRITICAL: Only return user locations, NOT admin locations
 */
router.get('/locations', auth, async (req: Request, res: Response) => {
  try {
    const conn = await pool.getConnection();

    const [rows]: any = await conn.query(
      "SELECT DISTINCT location FROM users WHERE role = 'user' AND location IS NOT NULL AND location != '' ORDER BY location ASC"
    );

    conn.release();

    const locations = (rows || []).map((row: any) => row.location);
    res.json({ data: locations });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
