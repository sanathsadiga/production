import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'mmcl_production',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export interface ProductionRecord {
  id: number;
  user_id: number;
  publication_id: number | null;
  custom_publication_name: string | null;
  po_number: number;
  color_pages: number;
  bw_pages: number;
  total_pages: number;
  machine_id: number;
  lprs_time: string;
  page_start_time: string;
  page_end_time: string;
  downtime_entries?: Array<{ downtime_reason_id: number; downtime_duration: string }>;
  newsprint_id: number | null;
  newsprint_kgs: number;
  plate_consumption: number;
  page_wastes: number;
  wastes?: number; // Legacy - for backward compatibility with plate_consumption waste
  remarks: string;
  record_date: string;
  created_at: Date;
}

// Get all production records with downtime entries
export const getAllRecords = async (): Promise<ProductionRecord[]> => {
  try {
    const conn = await pool.getConnection();

    // Get all production records
    const [records]: any = await conn.query(
      `SELECT * FROM production_records ORDER BY record_date DESC`
    );

    // Get downtime entries for each record
    const recordsWithDowntime = await Promise.all(
      records.map(async (record: any) => {
        const [downtimeEntries]: any = await conn.query(
          `SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?`,
          [record.id]
        );
        return {
          ...record,
          downtime_entries: Array.isArray(downtimeEntries) ? downtimeEntries : [],
        };
      })
    );

    conn.release();
    return recordsWithDowntime;
  } catch (error) {
    console.error('Error fetching all records:', error);
    return [];
  }
};

// Add new production record with downtime entries
export const addRecord = async (record: ProductionRecord): Promise<ProductionRecord> => {
  const conn = await pool.getConnection();

  try {
    // Validate required fields
    if (!record.user_id || !record.machine_id) {
      throw new Error('user_id and machine_id are required');
    }

    console.log('Inserting production record with values:', {
      user_id: record.user_id,
      publication_id: record.publication_id,
      po_number: record.po_number,
      color_pages: record.color_pages,
      bw_pages: record.bw_pages,
      total_pages: record.total_pages,
      machine_id: record.machine_id,
      lprs_time: record.lprs_time,
      page_start_time: record.page_start_time,
      page_end_time: record.page_end_time,
      newsprint_id: record.newsprint_id,
      record_date: record.record_date,
    });

    // Insert production record - CORRECT COLUMN ORDER
    const [insertResult]: any = await conn.query(
      `INSERT INTO production_records (
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
        newsprint_id,
        newsprint_kgs,
        plate_consumption,
        page_wastes,
        remarks,
        record_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.user_id,
        record.publication_id,
        record.custom_publication_name,
        record.po_number,
        record.color_pages,
        record.bw_pages,
        record.total_pages,
        record.machine_id,
        record.lprs_time,
        record.page_start_time,
        record.page_end_time,
        record.newsprint_id,
        record.newsprint_kgs,
        record.plate_consumption,
        record.page_wastes || 0,
        record.remarks,
        record.record_date,
      ]
    );

    const recordId = insertResult.insertId;

    // Insert downtime entries if provided
    if (record.downtime_entries && Array.isArray(record.downtime_entries)) {
      for (const downtime of record.downtime_entries) {
        await conn.query(
          `INSERT INTO downtime_entries (
            production_record_id,
            downtime_reason_id,
            downtime_duration
          ) VALUES (?, ?, ?)`,
          [recordId, downtime.downtime_reason_id, downtime.downtime_duration]
        );
      }
    }

    // Fetch the created record with downtime entries
    const [createdRecord]: any = await conn.query(
      `SELECT * FROM production_records WHERE id = ?`,
      [recordId]
    );

    if (!createdRecord || createdRecord.length === 0) {
      throw new Error('Failed to retrieve created record');
    }

    const recordData = createdRecord[0];

    // Get downtime entries
    const [downtimeEntries]: any = await conn.query(
      `SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?`,
      [recordId]
    );

    conn.release();

    return {
      ...recordData,
      downtime_entries: Array.isArray(downtimeEntries) ? downtimeEntries : [],
    };
  } catch (error: any) {
    conn.release();
    console.error('❌ FULL ERROR:', error.message);
    console.error('❌ SQL State:', error.sqlState);
    console.error('❌ SQL Code:', error.code);
    throw new Error(`Database insert failed: ${error.message}`);
  }
};

// Get records by filter
export const getRecordsByFilter = async (
  startDate?: string,
  endDate?: string,
  location?: string,
  publicationId?: number
): Promise<ProductionRecord[]> => {
  try {
    const conn = await pool.getConnection();

    let query = `SELECT * FROM production_records WHERE 1=1`;
    const params: any[] = [];

    if (startDate) {
      query += ` AND record_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND record_date <= ?`;
      params.push(endDate);
    }

    if (publicationId) {
      query += ` AND publication_id = ?`;
      params.push(publicationId);
    }

    query += ` ORDER BY record_date DESC`;

    const [records]: any = await conn.query(query, params);

    // Get downtime entries for each record
    const recordsWithDowntime = await Promise.all(
      records.map(async (record: any) => {
        const [downtimeEntries]: any = await conn.query(
          `SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?`,
          [record.id]
        );
        return {
          ...record,
          downtime_entries: Array.isArray(downtimeEntries) ? downtimeEntries : [],
        };
      })
    );

    conn.release();
    return recordsWithDowntime;
  } catch (error) {
    console.error('Error fetching records by filter:', error);
    return [];
  }
};

// Update production record
export const updateRecord = async (id: number, record: Partial<ProductionRecord>): Promise<ProductionRecord | null> => {
  const conn = await pool.getConnection();

  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (record.po_number !== undefined) {
      updates.push('po_number = ?');
      params.push(record.po_number);
    }

    if (record.color_pages !== undefined) {
      updates.push('color_pages = ?');
      params.push(record.color_pages);
    }

    if (record.bw_pages !== undefined) {
      updates.push('bw_pages = ?');
      params.push(record.bw_pages);
    }

    if (record.total_pages !== undefined) {
      updates.push('total_pages = ?');
      params.push(record.total_pages);
    }

    if (record.machine_id !== undefined) {
      updates.push('machine_id = ?');
      params.push(record.machine_id);
    }

    if (record.lprs_time !== undefined) {
      updates.push('lprs_time = ?');
      params.push(record.lprs_time);
    }

    if (record.page_start_time !== undefined) {
      updates.push('page_start_time = ?');
      params.push(record.page_start_time);
    }

    if (record.page_end_time !== undefined) {
      updates.push('page_end_time = ?');
      params.push(record.page_end_time);
    }

    if (record.newsprint_id !== undefined) {
      updates.push('newsprint_id = ?');
      params.push(record.newsprint_id);
    }

    if (record.newsprint_kgs !== undefined) {
      updates.push('newsprint_kgs = ?');
      params.push(record.newsprint_kgs);
    }

    if (record.plate_consumption !== undefined) {
      updates.push('plate_consumption = ?');
      params.push(record.plate_consumption);
    }

    if (record.page_wastes !== undefined) {
      updates.push('page_wastes = ?');
      params.push(record.page_wastes);
    }

    if (record.wastes !== undefined) {
      updates.push('wastes = ?');
      params.push(record.wastes);
    }

    if (record.remarks !== undefined) {
      updates.push('remarks = ?');
      params.push(record.remarks);
    }

    if (record.record_date !== undefined) {
      updates.push('record_date = ?');
      params.push(record.record_date);
    }

    if (updates.length === 0) {
      return null;
    }

    params.push(id);

    await conn.query(
      `UPDATE production_records SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch updated record
    const [updatedRecord]: any = await conn.query(
      `SELECT * FROM production_records WHERE id = ?`,
      [id]
    );

    if (!updatedRecord || updatedRecord.length === 0) {
      return null;
    }

    const recordData = updatedRecord[0];

    // Get downtime entries
    const [downtimeEntries]: any = await conn.query(
      `SELECT downtime_reason_id, downtime_duration FROM downtime_entries WHERE production_record_id = ?`,
      [id]
    );

    conn.release();

    return {
      ...recordData,
      downtime_entries: Array.isArray(downtimeEntries) ? downtimeEntries : [],
    };
  } catch (error) {
    conn.release();
    console.error('Error updating record:', error);
    return null;
  }
};

// Delete production record
export const deleteRecord = async (id: number): Promise<boolean> => {
  const conn = await pool.getConnection();

  try {
    // Delete downtime entries first (foreign key constraint)
    await conn.query('DELETE FROM downtime_entries WHERE production_record_id = ?', [id]);

    // Delete production record
    const result: any = await conn.query('DELETE FROM production_records WHERE id = ?', [id]);

    conn.release();

    return result.affectedRows > 0;
  } catch (error) {
    conn.release();
    console.error('Error deleting record:', error);
    return false;
  }
};