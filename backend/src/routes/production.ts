import express, { Request, Response } from 'express';
import { pool } from '../db';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ============================================
// GET PRODUCTION RECORDS
// ============================================

/**
 * Get all production records
 */
router.get('/records', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    
    let query = `
      SELECT 
        pr.*,
        u.name as user_name,
        u.email as user_email,
        u.location as user_location
      FROM production_records pr
      JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // Filter by publication IDs
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      query += ` AND pr.publication_id IN (${pubIds.map(() => '?').join(',')})`;
      params.push(...pubIds);
    }

    // Filter by date range
    if (start_date) {
      query += ` AND pr.record_date >= ?`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND pr.record_date <= ?`;
      params.push(end_date);
    }

    // Filter by location
    if (location) {
      query += ` AND u.location = ?`;
      params.push(location);
    }

    query += ` ORDER BY pr.record_date DESC`;

    const conn = await pool.getConnection();
    const [records]: any = await conn.query(query, params);

    // Get downtime entries for each record
    const recordsWithDowntime = await Promise.all(
      (records || []).map(async (record: any) => {
        const [downtime]: any = await conn.query(
          'SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?',
          [record.id]
        );
        return {
          ...record,
          downtime_entries: downtime || [],
        };
      })
    );

    conn.release();
    res.json({ data: recordsWithDowntime });
  } catch (error: any) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get production records by user ID
 */
router.get('/records/user/:userId', auth, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const conn = await pool.getConnection();
    
    const [records]: any = await conn.query(
      'SELECT * FROM production_records WHERE user_id = ? ORDER BY record_date DESC',
      [parseInt(userId)]
    );
    
    // Get downtime entries for each record
    const recordsWithDowntime = await Promise.all(
      (records || []).map(async (record: any) => {
        const [downtime]: any = await conn.query(
          'SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?',
          [record.id]
        );
        return {
          ...record,
          downtime_entries: downtime || [],
        };
      })
    );
    
    conn.release();
    res.json({ data: recordsWithDowntime });
  } catch (error: any) {
    console.error('Error fetching user records:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create production record
 */
router.post('/records', auth, async (req: AuthRequest, res) => {
  try {
    const {
      user_id,
      publication_id,
      custom_publication_name,
      po_number,
      color_pages,
      bw_pages,
      total_pages,
      machine_id,
      lprs_time,
      page_start_time,
      page_end_time,
      downtime_entries,
      newsprint_id,
      newsprint_kgs,
      plate_consumption,
      page_wastes,
      wastes,
      remarks,
      record_date,
    } = req.body;

    const conn = await pool.getConnection();

    // Insert production record
    const [result]: any = await conn.query(
      `INSERT INTO production_records (
        user_id, publication_id, custom_publication_name, po_number,
        color_pages, bw_pages, total_pages, machine_id, lprs_time,
        page_start_time, page_end_time, newsprint_id, newsprint_kgs,
        plate_consumption, page_wastes, wastes, remarks, record_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        publication_id || null,
        custom_publication_name || null,
        po_number,
        color_pages,
        bw_pages,
        total_pages,
        machine_id,
        lprs_time,
        page_start_time,
        page_end_time,
        newsprint_id || null,
        newsprint_kgs,
        plate_consumption,
        page_wastes || 0,
        wastes || 0,
        remarks,
        record_date,
      ]
    );

    const recordId = result.insertId;

    // Insert downtime entries
    if (downtime_entries && Array.isArray(downtime_entries)) {
      for (const entry of downtime_entries) {
        if (entry.downtime_reason_id) {
          await conn.query(
            `INSERT INTO downtime_entries (production_record_id, downtime_reason_id, downtime_duration)
             VALUES (?, ?, ?)`,
            [recordId, entry.downtime_reason_id, entry.downtime_duration]
          );
        }
      }
    }

    conn.release();
    res.status(201).json({ id: recordId, message: 'Record created successfully' });
  } catch (error: any) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update production record
 */
router.put('/records/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      po_number,
      color_pages,
      bw_pages,
      total_pages,
      machine_id,
      lprs_time,
      page_start_time,
      page_end_time,
      downtime_entries,
      newsprint_id,
      newsprint_kgs,
      plate_consumption,
      page_wastes,
      wastes,
      remarks,
      record_date,
    } = req.body;

    const conn = await pool.getConnection();

    // Update production record
    await conn.query(
      `UPDATE production_records SET
        po_number = ?, color_pages = ?, bw_pages = ?, total_pages = ?,
        machine_id = ?, lprs_time = ?, page_start_time = ?, page_end_time = ?,
        newsprint_id = ?, newsprint_kgs = ?, plate_consumption = ?, page_wastes = ?, wastes = ?,
        remarks = ?, record_date = ?
       WHERE id = ?`,
      [
        po_number,
        color_pages,
        bw_pages,
        total_pages,
        machine_id,
        lprs_time,
        page_start_time,
        page_end_time,
        newsprint_id || null,
        newsprint_kgs,
        plate_consumption,
        page_wastes || 0,
        wastes || 0,
        remarks,
        record_date,
        parseInt(id),
      ]
    );

    // Delete old downtime entries
    await conn.query('DELETE FROM downtime_entries WHERE production_record_id = ?', [parseInt(id)]);

    // Insert new downtime entries
    if (downtime_entries && Array.isArray(downtime_entries)) {
      for (const entry of downtime_entries) {
        if (entry.downtime_reason_id) {
          await conn.query(
            `INSERT INTO downtime_entries (production_record_id, downtime_reason_id, downtime_duration)
             VALUES (?, ?, ?)`,
            [parseInt(id), entry.downtime_reason_id, entry.downtime_duration]
          );
        }
      }
    }

    conn.release();
    res.json({ message: 'Record updated successfully' });
  } catch (error: any) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete production record
 */
router.delete('/records/:id', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();

    // Delete downtime entries first
    await conn.query('DELETE FROM downtime_entries WHERE production_record_id = ?', [parseInt(id)]);

    // Delete production record
    await conn.query('DELETE FROM production_records WHERE id = ?', [parseInt(id)]);

    conn.release();
    res.json({ message: 'Record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

/**
 * Analytics - Print Orders (PO) Comprehensive Analysis
 */
router.get('/analytics/print-orders', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    // Base where clause
    let baseWhere = `WHERE 1=1`;
    const params: any[] = [];

    if (start_date) {
      baseWhere += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseWhere += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      baseWhere += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      baseWhere += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    // 1. All POs with detailed information
    const allPOsQuery = `SELECT 
      pr.po_number,
      pr.id,
      pr.record_date,
      pr.total_pages,
      pr.color_pages,
      pr.bw_pages,
      COALESCE(p.name, pr.custom_publication_name) as publication_name,
      m.name as machine_name,
      u.name as operator_name,
      u.location,
      pr.newsprint_kgs,
      pr.plate_consumption
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    ORDER BY pr.po_number DESC`;

    // 2. PO summary by publication
    const byPublicationQuery = `SELECT 
      COALESCE(p.name, 'Custom') as publication_name,
      SUM(pr.po_number) as total_pos,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      AVG(pr.total_pages) as avg_pages_per_record,
      MIN(pr.total_pages) as min_pages,
      MAX(pr.total_pages) as max_pages,
      COUNT(DISTINCT m.id) as machines_used,
      SUM(pr.newsprint_kgs) as total_newsprint_kgs,
      SUM(pr.plate_consumption) as total_plates
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    ${baseWhere}
    GROUP BY p.id, p.name
    ORDER BY total_pos DESC`;

    // 3. PO summary by machine
    const byMachineQuery = `SELECT 
      m.name as machine_name,
      SUM(pr.po_number) as total_pos,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      AVG(pr.total_pages) as avg_pages_per_record,
      MIN(pr.total_pages) as min_pages,
      MAX(pr.total_pages) as max_pages,
      COUNT(DISTINCT COALESCE(p.name, pr.custom_publication_name)) as publications_printed,
      SUM(pr.newsprint_kgs) as total_newsprint_kgs,
      SUM(pr.plate_consumption) as total_plates
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN publications p ON pr.publication_id = p.id
    ${baseWhere}
    GROUP BY m.id, m.name
    ORDER BY total_pos DESC`;

    // 4. PO summary by publication + machine combination
    const byPubMachineQuery = `SELECT 
      COALESCE(p.name, pr.custom_publication_name) as publication_name,
      m.name as machine_name,
      SUM(pr.po_number) as total_pos,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      AVG(pr.total_pages) as avg_pages_per_record,
      SUM(pr.newsprint_kgs) as total_newsprint_kgs,
      SUM(pr.plate_consumption) as total_plates
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    ${baseWhere}
    GROUP BY p.id, p.name, pr.custom_publication_name, m.id, m.name
    ORDER BY publication_name, total_pos DESC`;

    // 5. Daily PO trend
    const dailyTrendQuery = `SELECT 
      DATE(pr.record_date) as date,
      SUM(pr.po_number) as pos_created,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    ${baseWhere}
    GROUP BY DATE(pr.record_date)
    ORDER BY date DESC`;

    const paramsCopy = [...params];
    const paramsTriple = [...params];
    const paramsQuad = [...params];
    const paramsQuint = [...params];

    const [allPOs, byPub, byMachine, byPubMachine, dailyTrend]: any = await Promise.all([
      conn.query(allPOsQuery, params),
      conn.query(byPublicationQuery, paramsCopy),
      conn.query(byMachineQuery, paramsTriple),
      conn.query(byPubMachineQuery, paramsQuad),
      conn.query(dailyTrendQuery, paramsQuint),
    ]);

    conn.release();

    // Convert to proper types
    const allPOsList = (allPOs[0] || []).map((po: any) => ({
      ...po,
      po_number: parseInt(po.po_number, 10) || 0,
      total_pages: parseInt(po.total_pages, 10) || 0,
      color_pages: parseInt(po.color_pages, 10) || 0,
      bw_pages: parseInt(po.bw_pages, 10) || 0,
      newsprint_kgs: parseFloat(po.newsprint_kgs) || 0,
      plate_consumption: parseInt(po.plate_consumption, 10) || 0,
    }));

    const byPublicationList = (byPub[0] || []).map((p: any) => ({
      ...p,
      total_pos: parseInt(p.total_pos, 10) || 0,
      total_records: parseInt(p.total_records, 10) || 0,
      total_pages: parseInt(p.total_pages, 10) || 0,
      avg_pages_per_record: parseFloat(p.avg_pages_per_record) || 0,
      min_pages: parseInt(p.min_pages, 10) || 0,
      max_pages: parseInt(p.max_pages, 10) || 0,
      machines_used: parseInt(p.machines_used, 10) || 0,
      total_newsprint_kgs: parseFloat(p.total_newsprint_kgs) || 0,
      total_plates: parseInt(p.total_plates, 10) || 0,
    }));

    const byMachineList = (byMachine[0] || []).map((m: any) => ({
      ...m,
      total_pos: parseInt(m.total_pos, 10) || 0,
      total_records: parseInt(m.total_records, 10) || 0,
      total_pages: parseInt(m.total_pages, 10) || 0,
      avg_pages_per_record: parseFloat(m.avg_pages_per_record) || 0,
      min_pages: parseInt(m.min_pages, 10) || 0,
      max_pages: parseInt(m.max_pages, 10) || 0,
      publications_printed: parseInt(m.publications_printed, 10) || 0,
      total_newsprint_kgs: parseFloat(m.total_newsprint_kgs) || 0,
      total_plates: parseInt(m.total_plates, 10) || 0,
    }));

    const byPubMachineList = (byPubMachine[0] || []).map((pm: any) => ({
      ...pm,
      total_pos: parseInt(pm.total_pos, 10) || 0,
      total_records: parseInt(pm.total_records, 10) || 0,
      total_pages: parseInt(pm.total_pages, 10) || 0,
      avg_pages_per_record: parseFloat(pm.avg_pages_per_record) || 0,
      total_newsprint_kgs: parseFloat(pm.total_newsprint_kgs) || 0,
      total_plates: parseInt(pm.total_plates, 10) || 0,
    }));

    const dailyTrendList = (dailyTrend[0] || []).map((d: any) => ({
      ...d,
      pos_created: parseInt(d.pos_created, 10) || 0,
      total_records: parseInt(d.total_records, 10) || 0,
      total_pages: parseInt(d.total_pages, 10) || 0,
    }));

    // Calculate overall statistics - SUM all PO numbers (not count unique)
    const totalPONumbers = allPOsList.reduce((sum: number, po: any) => sum + po.po_number, 0);
    const uniquePOCount = new Set(allPOsList.map((po: any) => po.po_number)).size;
    const totalRecords = allPOsList.length;
    const totalPages = allPOsList.reduce((sum: number, po: any) => sum + po.total_pages, 0);
    const uniqueMachines = new Set(allPOsList.map((po: any) => po.machine_name)).size;
    const uniquePublications = new Set(allPOsList.map((po: any) => po.publication_name)).size;
    const avgPagesPerPO = uniquePOCount > 0 ? Math.round(totalPages / uniquePOCount) : 0;

    res.json({
      all_pos: allPOsList,
      by_publication: byPublicationList,
      by_machine: byMachineList,
      by_publication_machine: byPubMachineList,
      daily_trend: dailyTrendList,
      statistics: {
        total_unique_pos: totalPONumbers,
        total_pages: totalPages,
        avg_pages_per_po: avgPagesPerPO,
        unique_machines: uniqueMachines,
        unique_publications: uniquePublications,
        total_records: totalRecords,
      },
    });
  } catch (error: any) {
    console.error('Error fetching print orders analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - PO Distribution by Publication (Legacy)
 */
router.get('/analytics/po', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    let query = `SELECT 
      p.id,
      p.name as publication_name,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    WHERE 1=1`;

    const params: any[] = [];

    if (start_date) {
      query += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      query += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      query += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    query += ` GROUP BY p.id, p.name ORDER BY total_records DESC`;

    const [records]: any = await conn.query(query, params);
    conn.release();

    res.json({
      data: records || [],
      count: records?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching PO analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - Machine Usage
 */
router.get('/analytics/machine', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    let query = `SELECT 
      m.id,
      m.name as machine_name,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      SUM(pr.plate_consumption) as total_plates
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    WHERE 1=1`;

    const params: any[] = [];

    if (start_date) {
      query += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      query += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      query += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    query += ` GROUP BY m.id, m.name ORDER BY total_plates DESC`;

    const [records]: any = await conn.query(query, params);
    conn.release();

    res.json({
      data: records || [],
      count: records?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching machine analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - Detailed Machine Usage Analysis
 */
router.get('/analytics/machine-detailed', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    // Base where clause
    let baseWhere = `WHERE 1=1`;
    const params: any[] = [];

    if (start_date) {
      baseWhere += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseWhere += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      baseWhere += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      baseWhere += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    // 1. Overall machine statistics
    const machineQuery = `SELECT 
      m.id,
      m.name as machine_name,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.total_pages) as avg_pages_per_record,
      MIN(pr.total_pages) as min_pages,
      MAX(pr.total_pages) as max_pages,
      COUNT(DISTINCT DATE(pr.record_date)) as days_used,
      SUM(pr.color_pages) as total_color_pages,
      SUM(pr.bw_pages) as total_bw_pages
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    ${baseWhere}
    GROUP BY m.id, m.name
    ORDER BY total_records DESC`;

    // 2. Machine usage by location
    const machineByLocationQuery = `SELECT 
      m.id,
      m.name as machine_name,
      u.location,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      AVG(pr.total_pages) as avg_pages
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    GROUP BY m.id, m.name, u.location
    ORDER BY m.name, total_pages DESC`;

    // 3. Machine usage by publication
    const machineByPubQuery = `SELECT 
      m.id,
      m.name as machine_name,
      pub.name as publication_name,
      COUNT(pr.id) as total_records,
      SUM(pr.total_pages) as total_pages,
      AVG(pr.total_pages) as avg_pages
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN publications pub ON pr.publication_id = pub.id
    ${baseWhere}
    GROUP BY m.id, m.name, pub.id, pub.name
    ORDER BY m.name, total_pages DESC`;

    // 4. Daily machine usage trend
    const dailyTrendQuery = `SELECT 
      DATE(pr.record_date) as date,
      m.name as machine_name,
      COUNT(pr.id) as record_count,
      SUM(pr.total_pages) as total_pages,
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.total_pages) as avg_pages
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    ${baseWhere}
    GROUP BY DATE(pr.record_date), m.id, m.name
    ORDER BY date DESC, machine_name`;

    const paramsCopy = [...params];
    const paramsTriple = [...params];
    const paramsQuad = [...params];

    const [machineRecords, locationRecords, pubRecords, dailyRecords]: any = await Promise.all([
      conn.query(machineQuery, params),
      conn.query(machineByLocationQuery, paramsCopy),
      conn.query(machineByPubQuery, paramsTriple),
      conn.query(dailyTrendQuery, paramsQuad),
    ]);

    conn.release();

    // Convert results to proper types and calculate overall statistics
    const machineStats = (machineRecords[0] || []).map((m: any) => ({
      ...m,
      total_records: parseInt(m.total_records, 10) || 0,
      total_pages: parseInt(m.total_pages, 10) || 0,
      total_plates: parseInt(m.total_plates, 10) || 0,
      avg_pages_per_record: parseFloat(m.avg_pages_per_record) || 0,
      min_pages: parseInt(m.min_pages, 10) || 0,
      max_pages: parseInt(m.max_pages, 10) || 0,
      days_used: parseInt(m.days_used, 10) || 0,
      total_color_pages: parseInt(m.total_color_pages, 10) || 0,
      total_bw_pages: parseInt(m.total_bw_pages, 10) || 0,
    }));

    const byLocation = (locationRecords[0] || []).map((l: any) => ({
      ...l,
      total_records: parseInt(l.total_records, 10) || 0,
      total_pages: parseInt(l.total_pages, 10) || 0,
      avg_pages: parseFloat(l.avg_pages) || 0,
    }));

    const byPublication = (pubRecords[0] || []).map((p: any) => ({
      ...p,
      total_records: parseInt(p.total_records, 10) || 0,
      total_pages: parseInt(p.total_pages, 10) || 0,
      avg_pages: parseFloat(p.avg_pages) || 0,
    }));

    const dailyTrend = (dailyRecords[0] || []).map((d: any) => ({
      ...d,
      record_count: parseInt(d.record_count, 10) || 0,
      total_pages: parseInt(d.total_pages, 10) || 0,
      total_plates: parseInt(d.total_plates, 10) || 0,
      avg_pages: parseFloat(d.avg_pages) || 0,
    }));

    const totalPages = machineStats.reduce((sum: number, m: any) => sum + (m.total_pages || 0), 0);
    const totalRecords = machineStats.reduce((sum: number, m: any) => sum + (m.total_records || 0), 0);
    const totalPlates = machineStats.reduce((sum: number, m: any) => sum + (m.total_plates || 0), 0);
    const avgPagesPerRecord = totalRecords > 0 ? Math.round(totalPages / totalRecords) : 0;

    res.json({
      by_machine: machineStats,
      by_location: byLocation,
      by_publication: byPublication,
      daily_trend: dailyTrend,
      statistics: {
        total_machines: machineStats.length,
        total_records: totalRecords,
        total_pages: totalPages,
        total_plates: totalPlates,
        avg_pages_per_record: avgPagesPerRecord,
      },
    });
  } catch (error: any) {
    console.error('Error fetching detailed machine analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - LPRS Trend (Lines Per Running Second)
 */
router.get('/analytics/lprs', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    let query = `SELECT 
      DATE(pr.record_date) as date,
      AVG(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(pr.lprs_time, ':', 1), ':', -1) AS DECIMAL(10,2))) as avg_lprs,
      COUNT(pr.id) as record_count
    FROM production_records pr
    WHERE 1=1`;

    const params: any[] = [];

    if (start_date) {
      query += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      query += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      query += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    query += ` GROUP BY DATE(pr.record_date) ORDER BY date DESC LIMIT 7`;

    const [records]: any = await conn.query(query, params);
    conn.release();

    res.json({
      data: (records || []).reverse(), // Reverse to get chronological order
      count: records?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching LPRS analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - Newsprint Consumption by Type
 */
router.get('/analytics/newsprint', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    let query = `SELECT 
      nt.id,
      nt.name as newsprint_type,
      nt.gsm,
      COUNT(pr.id) as total_records,
      SUM(pr.newsprint_kgs) as total_kgs
    FROM production_records pr
    LEFT JOIN newsprint_types nt ON pr.newsprint_id = nt.id
    WHERE 1=1`;

    const params: any[] = [];

    if (start_date) {
      query += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      query += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      query += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    query += ` GROUP BY nt.id, nt.name, nt.gsm ORDER BY total_kgs DESC`;

    const [records]: any = await conn.query(query, params);
    conn.release();

    res.json({
      data: records || [],
      count: records?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching newsprint analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - Newsprint KGs Trend
 */
router.get('/analytics/newsprint-kgs', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    // Base where clause
    let baseWhere = `WHERE 1=1`;
    const params: any[] = [];

    if (start_date) {
      baseWhere += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseWhere += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      baseWhere += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      baseWhere += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    // 1. Daily trend
    const dailyQuery = `SELECT 
      DATE(pr.record_date) as date,
      SUM(pr.newsprint_kgs) as total_kgs,
      AVG(pr.newsprint_kgs) as avg_kgs,
      COUNT(pr.id) as record_count
    FROM production_records pr
    ${baseWhere}
    GROUP BY DATE(pr.record_date) 
    ORDER BY date ASC`;

    // 2. By Publication
    const pubQuery = `SELECT 
      pub.name as publication_name,
      SUM(pr.newsprint_kgs) as total_kgs,
      AVG(pr.newsprint_kgs) as avg_kgs,
      COUNT(pr.id) as record_count,
      MIN(pr.newsprint_kgs) as min_kgs,
      MAX(pr.newsprint_kgs) as max_kgs
    FROM production_records pr
    LEFT JOIN publications pub ON pr.publication_id = pub.id
    ${baseWhere}
    GROUP BY pub.id, pub.name
    ORDER BY total_kgs DESC`;

    // 3. By Newsprint Type
    const typeQuery = `SELECT 
      nt.name as newsprint_type,
      SUM(pr.newsprint_kgs) as total_kgs,
      AVG(pr.newsprint_kgs) as avg_kgs,
      COUNT(pr.id) as record_count,
      MIN(pr.newsprint_kgs) as min_kgs,
      MAX(pr.newsprint_kgs) as max_kgs
    FROM production_records pr
    LEFT JOIN newsprint_types nt ON pr.newsprint_id = nt.id
    ${baseWhere}
    GROUP BY nt.id, nt.name
    ORDER BY total_kgs DESC`;

    // 4. Overall Statistics
    const statsQuery = `SELECT 
      SUM(pr.newsprint_kgs) as total_kgs,
      AVG(pr.newsprint_kgs) as avg_kgs,
      MIN(pr.newsprint_kgs) as min_kgs,
      MAX(pr.newsprint_kgs) as max_kgs,
      COUNT(pr.id) as total_records,
      COUNT(DISTINCT DATE(pr.record_date)) as total_days
    FROM production_records pr
    ${baseWhere}`;

    const paramsCopy = [...params];
    const [dailyRecords, pubRecords, typeRecords, statsRecords]: any = await Promise.all([
      conn.query(dailyQuery, params),
      conn.query(pubQuery, paramsCopy),
      conn.query(typeQuery, [...params]),
      conn.query(statsQuery, [...params]),
    ]);

    conn.release();

    const stats = statsRecords[0][0] || {
      total_kgs: 0,
      avg_kgs: 0,
      min_kgs: 0,
      max_kgs: 0,
      total_records: 0,
      total_days: 0,
    };

    // Calculate daily average (avg per day across all days)
    const dailyAverage = stats.total_days > 0 ? stats.total_kgs / stats.total_days : 0;

    res.json({
      daily_trend: dailyRecords[0] || [],
      by_publication: pubRecords[0] || [],
      by_newsprint_type: typeRecords[0] || [],
      statistics: {
        total_kgs: Math.round(stats.total_kgs || 0),
        avg_kgs_per_record: Math.round(stats.avg_kgs || 0),
        avg_kgs_per_day: Math.round(dailyAverage),
        min_kgs: Math.round(stats.min_kgs || 0),
        max_kgs: Math.round(stats.max_kgs || 0),
        total_records: stats.total_records || 0,
        total_days: stats.total_days || 0,
      },
      count: (dailyRecords[0] || []).length,
    });
  } catch (error: any) {
    console.error('Error fetching newsprint KGs analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - Plate Consumption Analysis
 */
router.get('/analytics/plate-consumption', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    // Base where clause
    let baseWhere = `WHERE 1=1`;
    const params: any[] = [];

    if (start_date) {
      baseWhere += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseWhere += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      baseWhere += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      baseWhere += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    // 1. Daily trend
    const dailyQuery = `SELECT 
      DATE(pr.record_date) as date,
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.plate_consumption) as avg_plates,
      COUNT(pr.id) as record_count,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    ${baseWhere}
    GROUP BY DATE(pr.record_date) 
    ORDER BY date ASC`;

    // 2. By Publication
    const pubQuery = `SELECT 
      pub.name as publication_name,
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.plate_consumption) as avg_plates,
      COUNT(pr.id) as record_count,
      MIN(pr.plate_consumption) as min_plates,
      MAX(pr.plate_consumption) as max_plates,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    LEFT JOIN publications pub ON pr.publication_id = pub.id
    ${baseWhere}
    GROUP BY pub.id, pub.name
    ORDER BY total_plates DESC`;

    // 3. By Machine
    const machineQuery = `SELECT 
      m.name as machine_name,
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.plate_consumption) as avg_plates,
      COUNT(pr.id) as record_count,
      MIN(pr.plate_consumption) as min_plates,
      MAX(pr.plate_consumption) as max_plates,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    ${baseWhere}
    GROUP BY m.id, m.name
    ORDER BY total_plates DESC`;

    // 4. By User/Operator
    const userQuery = `SELECT 
      u.name as operator_name,
      u.location,
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.plate_consumption) as avg_plates,
      COUNT(pr.id) as record_count,
      MIN(pr.plate_consumption) as min_plates,
      MAX(pr.plate_consumption) as max_plates,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    GROUP BY u.id, u.name, u.location
    ORDER BY total_plates DESC`;

    // 5. Overall Statistics
    const statsQuery = `SELECT 
      SUM(pr.plate_consumption) as total_plates,
      AVG(pr.plate_consumption) as avg_plates,
      MIN(pr.plate_consumption) as min_plates,
      MAX(pr.plate_consumption) as max_plates,
      COUNT(pr.id) as total_records,
      COUNT(DISTINCT DATE(pr.record_date)) as total_days,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    ${baseWhere}`;

    // 6. Plate per Page analysis (efficiency metric)
    const efficiencyQuery = `SELECT 
      DATE(pr.record_date) as date,
      ROUND(SUM(pr.plate_consumption) / NULLIF(SUM(pr.total_pages), 0), 4) as plate_per_page,
      COUNT(pr.id) as record_count
    FROM production_records pr
    ${baseWhere}
    GROUP BY DATE(pr.record_date)
    ORDER BY date ASC`;

    const paramsCopy = [...params];
    const [dailyRecords, pubRecords, machineRecords, userRecords, statsRecords, efficiencyRecords]: any = await Promise.all([
      conn.query(dailyQuery, params),
      conn.query(pubQuery, paramsCopy),
      conn.query(machineQuery, [...params]),
      conn.query(userQuery, [...params]),
      conn.query(statsQuery, [...params]),
      conn.query(efficiencyQuery, [...params]),
    ]);

    conn.release();

    const stats = statsRecords[0][0] || {
      total_plates: 0,
      avg_plates: 0,
      min_plates: 0,
      max_plates: 0,
      total_records: 0,
      total_days: 0,
      total_pages: 0,
    };

    // Calculate daily average
    const dailyAverage = stats.total_days > 0 ? stats.total_plates / stats.total_days : 0;
    const platePerPage = stats.total_pages > 0 ? stats.total_plates / stats.total_pages : 0;

    res.json({
      daily_trend: dailyRecords[0] || [],
      by_publication: pubRecords[0] || [],
      by_machine: machineRecords[0] || [],
      by_operator: userRecords[0] || [],
      plate_per_page_trend: efficiencyRecords[0] || [],
      statistics: {
        total_plates: Math.round(stats.total_plates || 0),
        avg_plates_per_record: Math.round(stats.avg_plates || 0),
        avg_plates_per_day: Math.round(dailyAverage),
        min_plates: Math.round(stats.min_plates || 0),
        max_plates: Math.round(stats.max_plates || 0),
        total_records: stats.total_records || 0,
        total_days: stats.total_days || 0,
        total_pages: Math.round(stats.total_pages || 0),
        plate_per_page: Math.round(platePerPage * 10000) / 10000, // 4 decimal places
      },
      count: (dailyRecords[0] || []).length,
    });
  } catch (error: any) {
    console.error('Error fetching plate consumption analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analytics - Machine Downtime Reasons
 */
router.get('/analytics/machine-downtime', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    let query = `SELECT 
      dr.id,
      dr.name as downtime_reason,
      dr.category,
      COUNT(de.id) as total_occurrences,
      SUM(TIME_TO_SEC(de.downtime_duration)) as total_seconds
    FROM downtime_entries de
    LEFT JOIN downtime_reasons dr ON de.downtime_reason_id = dr.id
    LEFT JOIN production_records pr ON de.production_record_id = pr.id
    WHERE 1=1`;

    const params: any[] = [];

    if (start_date) {
      query += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      query += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      query += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    query += ` GROUP BY dr.id, dr.name, dr.category ORDER BY total_occurrences DESC`;

    const [records]: any = await conn.query(query, params);

    // Helper function: Convert TIME format HH:MM:SS to total seconds
    function timeToSeconds(timeStr: string): number {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const parts = timeStr.split(':');
      if (parts.length !== 3) return 0;
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }

    // Helper function: Convert seconds back to HH:MM:SS format
    function secondsToTime(totalSeconds: number): string {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = Math.floor(totalSeconds % 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Calculate avg_per_day for each downtime reason
    const formattedRecords = await Promise.all(
      (records || []).map(async (record: any) => {
        // Fetch all detailed records for this downtime reason to group by date
        let detailQuery = `SELECT pr.record_date, de.downtime_duration
          FROM downtime_entries de
          LEFT JOIN production_records pr ON de.production_record_id = pr.id
          WHERE de.downtime_reason_id = ?`;
        
        const detailParams: any[] = [record.id];

        if (start_date) {
          detailQuery += ' AND pr.record_date >= ?';
          detailParams.push(start_date);
        }

        if (end_date) {
          detailQuery += ' AND pr.record_date <= ?';
          detailParams.push(end_date);
        }

        if (publication_ids) {
          const ids = (publication_ids as string).split(',');
          detailQuery += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
          detailParams.push(...ids.map(id => parseInt(id)));
        }

        if (location) {
          detailQuery += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
          detailParams.push(location);
        }

        const [detailRecords]: any = await conn.query(detailQuery, detailParams);

        // Group by date and sum durations for each day
        const perDayData: { [key: string]: number } = {}; // date -> seconds
        (detailRecords || []).forEach((rec: any) => {
          const date = rec.record_date;
          const durationSeconds = timeToSeconds(rec.downtime_duration || '00:00:00');
          perDayData[date] = (perDayData[date] || 0) + durationSeconds;
        });

        // Calculate average across days with downtime
        const daysWithDowntime = Object.keys(perDayData).length;
        let totalPerDaySeconds = 0;
        Object.values(perDayData).forEach(seconds => {
          totalPerDaySeconds += seconds;
        });

        const avgPerDaySeconds = daysWithDowntime > 0 ? Math.floor(totalPerDaySeconds / daysWithDowntime) : 0;
        const avgPerDay = secondsToTime(avgPerDaySeconds);

        return {
          ...record,
          total_duration: formatSeconds(record.total_seconds || 0),
          avg_per_day: avgPerDay,
          days_with_downtime: daysWithDowntime,
        };
      })
    );

    conn.release();

    res.json({
      data: formattedRecords,
      count: formattedRecords.length,
    });
  } catch (error: any) {
    console.error('Error fetching machine downtime analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to format seconds to HH:MM:SS
function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get machine downtime breakdown by machine
 */
router.get('/analytics/downtime-by-machine', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    // Base where clause
    let baseWhere = `WHERE 1=1`;
    const params: any[] = [];

    if (start_date) {
      baseWhere += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseWhere += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      baseWhere += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      baseWhere += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    // Get downtime by machine
    const machineDowntimeQuery = `SELECT 
      m.id,
      m.name as machine_name,
      COUNT(de.id) as total_downtime_instances,
      SUM(TIME_TO_SEC(de.downtime_duration)) as total_downtime_seconds,
      AVG(TIME_TO_SEC(de.downtime_duration)) as avg_downtime_seconds,
      MIN(TIME_TO_SEC(de.downtime_duration)) as min_downtime_seconds,
      MAX(TIME_TO_SEC(de.downtime_duration)) as max_downtime_seconds,
      COUNT(DISTINCT DATE(pr.record_date)) as days_with_downtime
    FROM downtime_entries de
    LEFT JOIN production_records pr ON de.production_record_id = pr.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    ${baseWhere}
    GROUP BY m.id, m.name
    ORDER BY total_downtime_seconds DESC`;

    const paramsCopy = [...params];
    const [machineRecords]: any = await conn.query(machineDowntimeQuery, paramsCopy);

    conn.release();

    // Helper function: Convert seconds to HH:MM:SS format
    function secondsToTime(totalSeconds: number): string {
      if (!totalSeconds || totalSeconds < 0) return '00:00:00';
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = Math.floor(totalSeconds % 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Format and convert records
    const byMachine = (machineRecords || []).map((m: any) => ({
      id: m.id,
      machine_name: m.machine_name || 'Unknown',
      total_downtime_instances: parseInt(m.total_downtime_instances, 10) || 0,
      total_downtime_seconds: parseInt(m.total_downtime_seconds, 10) || 0,
      total_downtime_formatted: secondsToTime(parseInt(m.total_downtime_seconds, 10) || 0),
      avg_downtime_seconds: parseFloat(m.avg_downtime_seconds) || 0,
      avg_downtime_formatted: secondsToTime(parseFloat(m.avg_downtime_seconds) || 0),
      min_downtime_seconds: parseInt(m.min_downtime_seconds, 10) || 0,
      min_downtime_formatted: secondsToTime(parseInt(m.min_downtime_seconds, 10) || 0),
      max_downtime_seconds: parseInt(m.max_downtime_seconds, 10) || 0,
      max_downtime_formatted: secondsToTime(parseInt(m.max_downtime_seconds, 10) || 0),
      days_with_downtime: parseInt(m.days_with_downtime, 10) || 0,
    }));

    // Calculate total downtime across all machines
    const totalDowntimeSeconds = byMachine.reduce((sum: number, m: any) => sum + (m.total_downtime_seconds || 0), 0);
    const totalInstances = byMachine.reduce((sum: number, m: any) => sum + (m.total_downtime_instances || 0), 0);
    const avgDowntimePerInstance = totalInstances > 0 ? totalDowntimeSeconds / totalInstances : 0;

    res.json({
      by_machine: byMachine,
      statistics: {
        total_machines_with_downtime: byMachine.length,
        total_downtime_seconds: totalDowntimeSeconds,
        total_downtime_formatted: secondsToTime(totalDowntimeSeconds),
        total_instances: totalInstances,
        avg_downtime_per_instance: secondsToTime(avgDowntimePerInstance),
      },
    });
  } catch (error: any) {
    console.error('Error fetching machine downtime breakdown:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get downtime details by reason ID
 */
router.get('/analytics/downtime-details/:reasonId', auth, async (req: AuthRequest, res) => {
  try {
    const { reasonId } = req.params;
    const { publication_ids, start_date, end_date, location } = req.query;
    const conn = await pool.getConnection();

    let query = `SELECT 
      pr.id as production_record_id,
      pr.publication_id,
      pub.name as publication_name,
      pr.po_number,
      pr.record_date,
      de.downtime_duration,
      de.downtime_reason_id,
      dr.name as downtime_reason,
      dr.category
    FROM downtime_entries de
    LEFT JOIN downtime_reasons dr ON de.downtime_reason_id = dr.id
    LEFT JOIN production_records pr ON de.production_record_id = pr.id
    LEFT JOIN publications pub ON pr.publication_id = pub.id
    WHERE de.downtime_reason_id = ?`;

    const params: any[] = [parseInt(reasonId)];

    if (start_date) {
      query += ' AND pr.record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.record_date <= ?';
      params.push(end_date);
    }

    if (publication_ids) {
      const ids = (publication_ids as string).split(',');
      query += ` AND pr.publication_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids.map(id => parseInt(id)));
    }

    if (location) {
      query += ` AND (SELECT location FROM users WHERE users.id = pr.user_id) = ?`;
      params.push(location);
    }

    query += ` ORDER BY pr.record_date DESC`;

    const [records]: any = await conn.query(query, params);
    
    // Calculate per-day downtime aggregation
    const perDayData: { [key: string]: string } = {};
    (records || []).forEach((record: any) => {
      const date = record.record_date;
      if (!perDayData[date]) {
        perDayData[date] = '00:00:00';
      }
      
      // Sum durations for the same day
      const existingDuration = perDayData[date];
      const newDuration = record.downtime_duration || '00:00:00';
      
      // Convert TIME format to seconds, add, and convert back
      const existingSeconds = timeToSeconds(existingDuration);
      const newSeconds = timeToSeconds(newDuration);
      const totalSeconds = existingSeconds + newSeconds;
      
      perDayData[date] = secondsToTime(totalSeconds);
    });

    // Calculate average per day
    const daysWithDowntime = Object.keys(perDayData).length;
    let avgPerDaySeconds = 0;
    
    if (daysWithDowntime > 0) {
      let totalSeconds = 0;
      Object.values(perDayData).forEach((timeStr: string) => {
        totalSeconds += timeToSeconds(timeStr);
      });
      avgPerDaySeconds = Math.floor(totalSeconds / daysWithDowntime);
    }
    
    const avgPerDay = secondsToTime(avgPerDaySeconds);

    // Extract unique publications affected
    const publicationsAffected = [...new Set((records || []).map((r: any) => r.publication_name).filter(Boolean))];

    conn.release();

    res.json({
      data: records || [],
      publications_affected: publicationsAffected,
      count: (records || []).length,
      per_day_data: perDayData,
      days_with_downtime: daysWithDowntime,
      avg_per_day: avgPerDay,
    });
  } catch (error: any) {
    console.error('Error fetching downtime details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to convert TIME format (HH:MM:SS) to seconds
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

// ============================================
// GET PRINT DURATION ANALYTICS
// ============================================

/**
 * Get print duration analytics - calculate time difference between page_end_time and page_start_time
 * Shows total hours, average hours, min/max hours per publication
 */
router.get('/analytics/print-duration', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;

    // Build WHERE clause
    let baseWhere = `WHERE pr.record_date BETWEEN ? AND ?`;
    const params: any[] = [start_date, end_date];

    if (publication_ids && publication_ids !== '') {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id, 10));
      baseWhere += ` AND (pr.publication_id IN (${pubIds.join(',')}) OR pr.custom_publication_name IS NOT NULL)`;
    }

    if (location && location !== '') {
      baseWhere += ` AND u.location = ?`;
      params.push(location);
    }

    const conn = await pool.getConnection();

    // 1. Get all records with duration calculation
    const allRecordsQuery = `SELECT 
      pr.id,
      COALESCE(p.name, pr.custom_publication_name) as publication_name,
      pr.page_start_time,
      pr.page_end_time,
      TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time)) as duration_seconds,
      pr.total_pages,
      pr.po_number,
      m.name as machine_name,
      u.location,
      pr.record_date
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    ORDER BY pr.record_date DESC`;

    // 2. Duration by publication
    const byPublicationQuery = `SELECT 
      COALESCE(p.name, pr.custom_publication_name) as publication_name,
      COUNT(pr.id) as total_records,
      ROUND(SUM(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as total_hours,
      ROUND(AVG(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as avg_hours,
      ROUND(MIN(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as min_hours,
      ROUND(MAX(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as max_hours,
      SUM(pr.total_pages) as total_pages,
      COUNT(DISTINCT m.id) as machines_used
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    GROUP BY p.id, p.name, pr.custom_publication_name
    ORDER BY total_hours DESC`;

    // 3. Duration by machine
    const byMachineQuery = `SELECT 
      m.name as machine_name,
      COUNT(pr.id) as total_records,
      ROUND(SUM(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as total_hours,
      ROUND(AVG(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as avg_hours,
      ROUND(MIN(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as min_hours,
      ROUND(MAX(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as max_hours,
      SUM(pr.total_pages) as total_pages,
      COUNT(DISTINCT p.id) as publications_count
    FROM production_records pr
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    GROUP BY m.id, m.name
    ORDER BY total_hours DESC`;

    // 4. Daily trend
    const dailyTrendQuery = `SELECT 
      DATE(pr.record_date) as date,
      COUNT(pr.id) as total_records,
      ROUND(SUM(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as total_hours,
      ROUND(AVG(TIME_TO_SEC(TIMEDIFF(pr.page_end_time, pr.page_start_time))) / 3600, 2) as avg_hours,
      SUM(pr.total_pages) as total_pages
    FROM production_records pr
    LEFT JOIN publications p ON pr.publication_id = p.id
    LEFT JOIN machines m ON pr.machine_id = m.id
    LEFT JOIN users u ON pr.user_id = u.id
    ${baseWhere}
    GROUP BY DATE(pr.record_date)
    ORDER BY date DESC`;

    const paramsCopy = [...params];
    const paramsTriple = [...params];
    const paramsQuad = [...params];
    const paramsQuint = [...params];

    const [allRecords, byPub, byMachine, dailyTrend]: any = await Promise.all([
      conn.query(allRecordsQuery, params),
      conn.query(byPublicationQuery, paramsCopy),
      conn.query(byMachineQuery, paramsTriple),
      conn.query(dailyTrendQuery, paramsQuint),
    ]);

    conn.release();

    // Convert to proper types
    const allRecordsList = (allRecords[0] || []).map((record: any) => ({
      ...record,
      duration_seconds: parseInt(record.duration_seconds, 10) || 0,
      total_pages: parseInt(record.total_pages, 10) || 0,
      po_number: parseInt(record.po_number, 10) || 0,
    }));

    const byPublicationList = (byPub[0] || []).map((p: any) => ({
      ...p,
      total_records: parseInt(p.total_records, 10) || 0,
      total_hours: parseFloat(p.total_hours) || 0,
      avg_hours: parseFloat(p.avg_hours) || 0,
      min_hours: parseFloat(p.min_hours) || 0,
      max_hours: parseFloat(p.max_hours) || 0,
      total_pages: parseInt(p.total_pages, 10) || 0,
      machines_used: parseInt(p.machines_used, 10) || 0,
    }));

    const byMachineList = (byMachine[0] || []).map((m: any) => ({
      ...m,
      total_records: parseInt(m.total_records, 10) || 0,
      total_hours: parseFloat(m.total_hours) || 0,
      avg_hours: parseFloat(m.avg_hours) || 0,
      min_hours: parseFloat(m.min_hours) || 0,
      max_hours: parseFloat(m.max_hours) || 0,
      total_pages: parseInt(m.total_pages, 10) || 0,
      publications_count: parseInt(m.publications_count, 10) || 0,
    }));

    const dailyTrendList = (dailyTrend[0] || []).map((d: any) => ({
      ...d,
      date: d.date,
      total_records: parseInt(d.total_records, 10) || 0,
      total_hours: parseFloat(d.total_hours) || 0,
      avg_hours: parseFloat(d.avg_hours) || 0,
      total_pages: parseInt(d.total_pages, 10) || 0,
    }));

    // Calculate statistics
    const totalRecords = allRecordsList.length;
    const totalSeconds = allRecordsList.reduce((sum: number, r: any) => sum + (r.duration_seconds || 0), 0);
    const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;
    const avgHours = totalRecords > 0 ? Math.round((totalSeconds / totalRecords / 3600) * 100) / 100 : 0;
    const maxHours = Math.max(...allRecordsList.map((r: any) => (r.duration_seconds || 0) / 3600));
    const minHours = Math.min(...allRecordsList.filter((r: any) => r.duration_seconds > 0).map((r: any) => (r.duration_seconds || 0) / 3600));
    const totalPages = allRecordsList.reduce((sum: number, r: any) => sum + (r.total_pages || 0), 0);
    const hoursPerPage = totalPages > 0 ? Math.round((totalHours / totalPages) * 10000) / 10000 : 0;

    res.json({
      all_records: allRecordsList,
      by_publication: byPublicationList,
      by_machine: byMachineList,
      daily_trend: dailyTrendList,
      statistics: {
        total_records: totalRecords,
        total_hours: totalHours,
        avg_hours: avgHours,
        min_hours: minHours > 0 ? minHours : 0,
        max_hours: maxHours > 0 ? maxHours : 0,
        total_pages: totalPages,
        hours_per_page: hoursPerPage,
      },
    });
  } catch (error: any) {
    console.error('Error fetching print duration analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to convert seconds to TIME format (HH:MM:SS)
function secondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get wastes analytics
 */
router.get('/analytics/wastes', auth, async (req: AuthRequest, res) => {
  try {
    const { publication_ids, start_date, end_date, location } = req.query;

    const params: any[] = [];

    // Build params array once - will be reused for all queries
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      params.push(...pubIds);
    }

    if (start_date) {
      params.push(start_date);
    }

    if (end_date) {
      params.push(end_date);
    }

    if (location) {
      params.push(location);
    }

    // Get daily trend
    let trendQuery = `
      SELECT 
        DATE(pr.record_date) as date,
        SUM(pr.wastes) as total_wastes,
        SUM(pr.page_wastes) as total_page_wastes,
        AVG(pr.wastes) as avg_wastes,
        AVG(pr.page_wastes) as avg_page_wastes,
        COUNT(DISTINCT pr.id) as total_records
      FROM production_records pr
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      trendQuery += ` AND pr.publication_id IN (${pubIds.map(() => '?').join(',')})`;
    }
    if (start_date) {
      trendQuery += ` AND pr.record_date >= ?`;
    }
    if (end_date) {
      trendQuery += ` AND pr.record_date <= ?`;
    }
    if (location) {
      trendQuery += ` AND u.location = ?`;
    }
    trendQuery += ` GROUP BY DATE(pr.record_date) ORDER BY date DESC`;
    
    const conn = await pool.getConnection();
    const [dailyTrend]: any = await conn.query(trendQuery, params);

    // Get by publication
    let pubQuery = `
      SELECT 
        pr.publication_id,
        pub.name as publication_name,
        SUM(pr.wastes) as total_wastes,
        SUM(pr.page_wastes) as total_page_wastes,
        AVG(pr.wastes) as avg_wastes,
        AVG(pr.page_wastes) as avg_page_wastes,
        COUNT(DISTINCT pr.po_number) as total_pos,
        SUM(pr.total_pages) as total_pages
      FROM production_records pr
      LEFT JOIN publications pub ON pr.publication_id = pub.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      pubQuery += ` AND pr.publication_id IN (${pubIds.map(() => '?').join(',')})`;
    }
    if (start_date) {
      pubQuery += ` AND pr.record_date >= ?`;
    }
    if (end_date) {
      pubQuery += ` AND pr.record_date <= ?`;
    }
    if (location) {
      pubQuery += ` AND u.location = ?`;
    }
    pubQuery += ` GROUP BY pr.publication_id, pub.name ORDER BY total_wastes DESC`;
    const [byPublication]: any = await conn.query(pubQuery, params);

    // Get by machine
    let machineQuery = `
      SELECT 
        pr.machine_id,
        m.name as machine_name,
        SUM(pr.wastes) as total_wastes,
        SUM(pr.page_wastes) as total_page_wastes,
        AVG(pr.wastes) as avg_wastes,
        AVG(pr.page_wastes) as avg_page_wastes,
        COUNT(DISTINCT pr.po_number) as total_pos,
        SUM(pr.total_pages) as total_pages
      FROM production_records pr
      LEFT JOIN machines m ON pr.machine_id = m.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      machineQuery += ` AND pr.publication_id IN (${pubIds.map(() => '?').join(',')})`;
    }
    if (start_date) {
      machineQuery += ` AND pr.record_date >= ?`;
    }
    if (end_date) {
      machineQuery += ` AND pr.record_date <= ?`;
    }
    if (location) {
      machineQuery += ` AND u.location = ?`;
    }
    machineQuery += ` GROUP BY pr.machine_id, m.name ORDER BY total_wastes DESC`;
    const [byMachine]: any = await conn.query(machineQuery, params);

    // Get wastes with plates comparison (by PO)
    let plateComparisonQuery = `
      SELECT 
        pr.po_number,
        pub.name as publication_name,
        m.name as machine_name,
        pr.total_pages,
        pr.plate_consumption,
        pr.wastes,
        pr.page_wastes,
        pr.record_date
      FROM production_records pr
      LEFT JOIN publications pub ON pr.publication_id = pub.id
      LEFT JOIN machines m ON pr.machine_id = m.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      plateComparisonQuery += ` AND pr.publication_id IN (${pubIds.map(() => '?').join(',')})`;
    }
    if (start_date) {
      plateComparisonQuery += ` AND pr.record_date >= ?`;
    }
    if (end_date) {
      plateComparisonQuery += ` AND pr.record_date <= ?`;
    }
    if (location) {
      plateComparisonQuery += ` AND u.location = ?`;
    }
    plateComparisonQuery += ` ORDER BY pr.record_date DESC LIMIT 100`;
    const [plateComparison]: any = await conn.query(plateComparisonQuery, params);

    // Get overall statistics
    let statsQuery = `
      SELECT 
        SUM(pr.wastes) as total_wastes,
        SUM(pr.page_wastes) as total_page_wastes,
        AVG(pr.wastes) as avg_wastes,
        AVG(pr.page_wastes) as avg_page_wastes,
        MIN(pr.wastes) as min_wastes,
        MIN(pr.page_wastes) as min_page_wastes,
        MAX(pr.wastes) as max_wastes,
        MAX(pr.page_wastes) as max_page_wastes,
        SUM(pr.plate_consumption) as total_plates,
        AVG(pr.plate_consumption) as avg_plates,
        COUNT(DISTINCT pr.id) as total_records,
        COUNT(DISTINCT DATE(pr.record_date)) as days_tracked
      FROM production_records pr
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    if (publication_ids) {
      const pubIds = String(publication_ids).split(',').map(id => parseInt(id.trim()));
      statsQuery += ` AND pr.publication_id IN (${pubIds.map(() => '?').join(',')})`;
    }
    if (start_date) {
      statsQuery += ` AND pr.record_date >= ?`;
    }
    if (end_date) {
      statsQuery += ` AND pr.record_date <= ?`;
    }
    if (location) {
      statsQuery += ` AND u.location = ?`;
    }

    const [stats]: any = await conn.query(statsQuery, params);
    conn.release();

    res.json({
      statistics: stats[0] || {
        total_wastes: 0,
        avg_wastes: 0,
        min_wastes: 0,
        max_wastes: 0,
        total_records: 0,
        days_tracked: 0,
      },
      daily_trend: dailyTrend || [],
      by_publication: byPublication || [],
      by_machine: byMachine || [],
      plate_comparison: plateComparison || [],
    });
  } catch (error: any) {
    console.error('Error fetching wastes analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
