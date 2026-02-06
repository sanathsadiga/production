import express, { Request, Response } from 'express';
import { MACHINES, PUBLICATIONS, DOWNTIME_REASONS, NEWSPRINT_TYPES, USERS } from '../constants';
import { ProductionRecord, getAllRecords, addRecord, getRecordsByFilter } from '../models/production';
import { pool } from '../db';
const router = express.Router();

// Create production record with multiple downtime entries
router.post('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      user_id,
      publication_id,
      custom_publication_name,
      po_number,
      color_pages,
      bw_pages,
      machine_id,
      lprs_time,
      page_start_time,
      page_end_time,
      downtime_entries,
      newsprint_id,
      newsprint_kgs,
      plate_consumption,
      remarks,
      record_date,
    } = req.body;

    // Validation
    if (!user_id || !machine_id || !po_number) {
      res.status(400).json({ error: 'Missing required fields: user_id, machine_id, po_number' });
      return;
    }

    // Verify user exists
    const user = USERS.find(u => u.id === parseInt(user_id));
    if (!user) {
      res.status(400).json({ error: 'Invalid user_id' });
      return;
    }

    // Verify machine exists
    const machine = MACHINES.find(m => m.id === parseInt(machine_id));
    if (!machine) {
      res.status(400).json({ error: 'Invalid machine_id' });
      return;
    }

    // Validate publication: either publication_id OR custom_publication_name
    let finalPublicationId: number | null = null;
    let finalCustomPublicationName: string | null = null;

    if (publication_id && publication_id !== null) {
      finalPublicationId = parseInt(publication_id);
      const pub = PUBLICATIONS.find(p => p.id === finalPublicationId);
      if (!pub) {
        res.status(400).json({ error: 'Invalid publication_id' });
        return;
      }
      finalCustomPublicationName = null;
    } else if (custom_publication_name && custom_publication_name.trim().length > 0) {
      finalPublicationId = null;
      finalCustomPublicationName = custom_publication_name.trim();
    } else {
      res.status(400).json({ error: 'Either publication_id or custom_publication_name is required' });
      return;
    }

    // Validate downtime entries if provided
    const validDowntimeEntries: Array<{ downtime_reason_id: number; downtime_duration: string }> = [];
    
    if (downtime_entries && Array.isArray(downtime_entries)) {
      for (const entry of downtime_entries) {
        if (entry.downtime_reason_id && entry.downtime_duration) {
          const reason = DOWNTIME_REASONS.find(r => r.id === parseInt(entry.downtime_reason_id));
          if (!reason) {
            res.status(400).json({ error: `Invalid downtime_reason_id: ${entry.downtime_reason_id}` });
            return;
          }
          validDowntimeEntries.push({
            downtime_reason_id: parseInt(entry.downtime_reason_id),
            downtime_duration: String(entry.downtime_duration), // Keep as HH:MM:SS string
          });
        }
      }
    }

    // Validate newsprint if provided
    if (newsprint_id) {
      const newsprint = NEWSPRINT_TYPES.find(n => n.id === parseInt(newsprint_id));
      if (!newsprint) {
        res.status(400).json({ error: 'Invalid newsprint_id' });
        return;
      }
    }

    // Calculate total pages
    const colorPagesNum = parseInt(color_pages) || 0;
    const bwPagesNum = parseInt(bw_pages) || 0;
    const totalPages = colorPagesNum + bwPagesNum;

    const record: ProductionRecord = {
      id: 0,
      user_id: parseInt(user_id),
      publication_id: finalPublicationId,
      custom_publication_name: finalCustomPublicationName,
      po_number: parseInt(po_number),
      color_pages: colorPagesNum,
      bw_pages: bwPagesNum,
      total_pages: totalPages,
      machine_id: parseInt(machine_id),
      lprs_time,
      page_start_time,
      page_end_time,
      downtime_entries: validDowntimeEntries,
      newsprint_id: newsprint_id ? parseInt(newsprint_id) : null,
      newsprint_kgs: parseFloat(newsprint_kgs) || 0,
      plate_consumption: parseInt(plate_consumption) || 0,
      remarks: remarks || '',
      record_date,
      created_at: new Date(),
    };

    console.log('Creating production record:', {
      user_id: record.user_id,
      publication_id: record.publication_id,
      custom_publication_name: record.custom_publication_name,
      color_pages: record.color_pages,
      bw_pages: record.bw_pages,
      total_pages: record.total_pages,
      downtime_entries: record.downtime_entries,
      po_number: record.po_number,
      machine_id: record.machine_id,
      record_date: record.record_date,
    });

    const savedRecord = await addRecord(record);

    res.status(201).json({
      success: true,
      message: 'Production record created successfully',
      data: savedRecord,
    });
  } catch (error: any) {
    console.error('❌ PRODUCTION ERROR:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to create production record',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all records
router.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await getAllRecords();
    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Get filtered records
router.get('/records/filter', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, location, publication_id } = req.query;

    let records = await getAllRecords();

    if (startDate) {
      records = records.filter(r => new Date(r.record_date) >= new Date(startDate as string));
    }

    if (endDate) {
      records = records.filter(r => new Date(r.record_date) <= new Date(endDate as string));
    }

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Error filtering records:', error);
    res.status(500).json({ error: 'Failed to filter records' });
  }
});

// Get one-time publications (for admin reference)
router.get('/records/one-time', async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await getAllRecords();
    const oneTimePublications = records
      .filter(r => r.custom_publication_name !== null)
      .map(r => ({
        id: r.id,
        custom_publication_name: r.custom_publication_name,
        user: USERS.find(u => u.id === r.user_id)?.name,
        record_date: r.record_date,
      }));

    res.json({
      success: true,
      data: oneTimePublications,
    });
  } catch (error) {
    console.error('Error fetching one-time publications:', error);
    res.status(500).json({ error: 'Failed to fetch one-time publications' });
  }
});

// Get all records for a user (optional date filter)
router.get('/records/user/:user_id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;

    const conn = await pool.getConnection();

    // Get production records for user
    const [records]: any = await conn.query(
      `SELECT * FROM production_records WHERE user_id = ? ORDER BY record_date DESC`,
      [parseInt(user_id)]
    );

    // Apply date filters if provided
    let filteredRecords = records;
    if (start_date) {
      filteredRecords = filteredRecords.filter((r: any) => new Date(r.record_date) >= new Date(start_date as string));
    }
    if (end_date) {
      filteredRecords = filteredRecords.filter((r: any) => new Date(r.record_date) <= new Date(end_date as string));
    }

    // Get downtime entries for each record
    const recordsWithDowntime = await Promise.all(
      filteredRecords.map(async (record: any) => {
        const [downtimeEntries]: any = await conn.query(
          `SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?`,
          [record.id]
        );
        return {
          ...record,
          downtime_entries: downtimeEntries && Array.isArray(downtimeEntries) ? downtimeEntries : [],
        };
      })
    );

    conn.release();

    res.json({
      success: true,
      data: recordsWithDowntime,
    });
  } catch (error: any) {
    console.error('Error fetching user production records:', error);
    res.status(500).json({ error: 'Failed to fetch production records' });
  }
});

// Get records filtered by admin criteria
router.get('/admin/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const { start_date, end_date, location, publication_id } = req.query;

    let records = await getAllRecords();

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    records.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Error fetching admin records:', error);
    res.status(500).json({ error: 'Failed to fetch admin records' });
  }
});

// Get records by machine (for chart)
router.get('/analytics/machine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publication_id, start_date, end_date, location } = req.query;

    let records = await getAllRecords();

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    const machineAnalytics = records.reduce((acc: any[], r) => {
      const machine = MACHINES.find(m => m.id === r.machine_id);
      const existing = acc.find(d => d.machine_name === machine?.name);

      if (existing) {
        existing.total_pages += r.color_pages + r.bw_pages;
        existing.count += 1;
      } else {
        acc.push({
          machine_name: machine?.name || 'Unknown',
          total_pages: r.color_pages + r.bw_pages,
          count: 1,
        });
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: machineAnalytics,
    });
  } catch (error) {
    console.error('Error fetching machine analytics:', error);
    res.status(500).json({ error: 'Failed to fetch machine analytics' });
  }
});

// Get LPRS analytics (for chart)
router.get('/analytics/lprs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publication_id, start_date, end_date, location } = req.query;

    let records = await getAllRecords();

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    // Group by date and calculate average LPRS
    const lprsMap = new Map<string, { total: number; count: number }>();

    records.forEach(r => {
      const date = r.record_date;
      const lprsMinutes = r.lprs_time
        ? parseInt(r.lprs_time.split(':')[0]) * 60 + parseInt(r.lprs_time.split(':')[1])
        : 0;

      const existing = lprsMap.get(date) || { total: 0, count: 0 };
      lprsMap.set(date, {
        total: existing.total + lprsMinutes,
        count: existing.count + 1,
      });
    });

    const lprsAnalytics = Array.from(lprsMap.entries())
      .map(([date, data]) => ({
        date,
        avg_lprs_minutes: Math.round(data.total / data.count),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    res.json({
      success: true,
      data: lprsAnalytics,
    });
  } catch (error) {
    console.error('Error fetching LPRS analytics:', error);
    res.status(500).json({ error: 'Failed to fetch LPRS analytics' });
  }
});

// Get Newsprint analytics (for chart)
router.get('/analytics/newsprint', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publication_id, start_date, end_date, location } = req.query;

    let records = await getAllRecords();

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    const newsprintAnalytics = records.reduce((acc: any[], r) => {
      if (!r.newsprint_id) return acc;

      const newsprint = NEWSPRINT_TYPES.find(n => n.id === r.newsprint_id);
      const existing = acc.find(d => d.newsprint_name === newsprint?.name);

      if (existing) {
        existing.total_consumption += r.plate_consumption;
        existing.count += 1;
      } else {
        acc.push({
          newsprint_name: newsprint?.name || 'Unknown',
          total_consumption: r.plate_consumption,
          count: 1,
        });
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: newsprintAnalytics,
    });
  } catch (error) {
    console.error('Error fetching newsprint analytics:', error);
    res.status(500).json({ error: 'Failed to fetch newsprint analytics' });
  }
});

// Get PO analytics (for chart)
router.get('/analytics/po', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publication_id, start_date, end_date, location } = req.query;

    let records = await getAllRecords();

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    const poAnalytics = records.reduce((acc: any[], r) => {
      const existing = acc.find(d => d.po_number === r.po_number);

      if (existing) {
        existing.total_pages += r.color_pages + r.bw_pages;
        existing.count += 1;
      } else {
        acc.push({
          po_number: r.po_number,
          total_pages: r.color_pages + r.bw_pages,
          count: 1,
        });
      }
      return acc;
    }, []);

    // Sort by count descending and limit to top 10
    const sortedPoAnalytics = poAnalytics
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      success: true,
      data: sortedPoAnalytics,
    });
  } catch (error) {
    console.error('Error fetching PO analytics:', error);
    res.status(500).json({ error: 'Failed to fetch PO analytics' });
  }
});

// Get Newsprint KGs consumption (for chart)
router.get('/analytics/newsprint-kgs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publication_id, start_date, end_date, location } = req.query;

    let records = await getAllRecords();

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    const newsprintKgsAnalytics = records.reduce((acc: any[], r) => {
      // Convert to number and validate
      const kgs = parseFloat(r.newsprint_kgs?.toString() || '0') || 0;

      // Only include records that have newsprint_id AND newsprint_kgs > 0
      if (!r.newsprint_id || kgs === 0) return acc;

      const newsprint = NEWSPRINT_TYPES.find(n => n.id === r.newsprint_id);
      const newsprintName = newsprint?.name || 'Unknown';
      const existing = acc.find(d => d.newsprint_name === newsprintName);

      if (existing) {
        existing.total_kgs += kgs;
        existing.count += 1;
        existing.avg_kgs = parseFloat((existing.total_kgs / existing.count).toFixed(2));
      } else {
        acc.push({
          newsprint_name: newsprintName,
          total_kgs: parseFloat(kgs.toFixed(2)),
          count: 1,
          avg_kgs: parseFloat(kgs.toFixed(2)),
        });
      }
      return acc;
    }, []);

    // Sort by total_kgs descending
    newsprintKgsAnalytics.sort((a, b) => b.total_kgs - a.total_kgs);

    res.json({
      success: true,
      data: newsprintKgsAnalytics,
    });
  } catch (error: any) {
    console.error('Error fetching newsprint KGs analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch newsprint KGs analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get Machine breakdown by downtime reasons (for line chart)
router.get('/analytics/machine-downtime', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publication_id, start_date, end_date, location } = req.query;

    let records = await getAllRecords();

    if (publication_id) {
      records = records.filter(r => r.publication_id === parseInt(publication_id as string));
    }

    if (start_date) {
      records = records.filter(r => new Date(r.record_date) >= new Date(start_date as string));
    }

    if (end_date) {
      records = records.filter(r => new Date(r.record_date) <= new Date(end_date as string));
    }

    if (location) {
      records = records.filter(r => {
        const user = USERS.find(u => u.id === r.user_id);
        return user?.location === location;
      });
    }

    // Get all downtime entries for these records
    const downtimeMap = new Map<string, Map<string, number>>();

    for (const record of records) {
      if (!record.downtime_entries || record.downtime_entries.length === 0) continue;

      const machine = MACHINES.find(m => m.id === record.machine_id);
      const machineName = machine?.name || 'Unknown';

      if (!downtimeMap.has(machineName)) {
        downtimeMap.set(machineName, new Map());
      }

      const machineDowntimes = downtimeMap.get(machineName)!;

      for (const downtime of record.downtime_entries) {
        const reason = DOWNTIME_REASONS.find(r => r.id === downtime.downtime_reason_id);
        // ✅ Fixed: use 'reason' instead of 'reasons'
        const reasonName = (reason?.reasons || 'Unknown') as string;

        // Convert HH:MM:SS to minutes
        const timeParts = downtime.downtime_duration.split(':');
        const durationMinutes =
          parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

        const existing = machineDowntimes.get(reasonName) || 0;
        machineDowntimes.set(reasonName, existing + durationMinutes);
      }
    }

    // Convert to array format for line chart
    const machineDowntimeAnalytics = Array.from(downtimeMap.entries()).map(
      ([machineName, downtimes]) => {
        const data: any = { machine_name: machineName };
        downtimes.forEach((minutes, reason) => {
          data[reason] = minutes; // Each reason becomes a column
        });
        return data;
      }
    );

    res.json({
      success: true,
      data: machineDowntimeAnalytics,
    });
  } catch (error: any) {
    console.error('Error fetching machine downtime analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch machine downtime analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update production record
router.put('/records/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const recordId = parseInt(req.params.id);
    const { po_number, color_pages, bw_pages, machine_id, lprs_time, page_start_time, page_end_time, downtime_entries, newsprint_id, newsprint_kgs, plate_consumption, remarks, record_date } = req.body;

    const conn = await pool.getConnection();

    // Update production record
    await conn.query(
      `UPDATE production_records SET po_number=?, color_pages=?, bw_pages=?, total_pages=?, machine_id=?, lprs_time=?, page_start_time=?, page_end_time=?, newsprint_id=?, newsprint_kgs=?, plate_consumption=?, remarks=?, record_date=? WHERE id=?`,
      [po_number, color_pages, bw_pages, color_pages + bw_pages, machine_id, lprs_time, page_start_time, page_end_time, newsprint_id, newsprint_kgs, plate_consumption, remarks, record_date, recordId]
    );

    // Delete existing downtime entries
    await conn.query('DELETE FROM downtime_entries WHERE production_record_id = ?', [recordId]);

    // Insert new downtime entries
    if (downtime_entries && Array.isArray(downtime_entries)) {
      for (const entry of downtime_entries) {
        await conn.query(
          'INSERT INTO downtime_entries (production_record_id, downtime_reason_id, downtime_duration) VALUES (?, ?, ?)',
          [recordId, entry.downtime_reason_id, entry.downtime_duration]
        );
      }
    }

    conn.release();

    res.json({
      success: true,
      message: 'Record updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// Delete production record
router.delete('/records/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const recordId = parseInt(req.params.id);
    const conn = await pool.getConnection();

    // Delete downtime entries
    await conn.query('DELETE FROM downtime_entries WHERE production_record_id = ?', [recordId]);

    // Delete production record
    await conn.query('DELETE FROM production_records WHERE id = ?', [recordId]);

    conn.release();

    res.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

export default router;
