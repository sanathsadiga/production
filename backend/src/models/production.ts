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
  downtime_entries: Array<{
    downtime_reason_id: number;
    downtime_duration: string;
  }>;
  newsprint_id: number | null;
  newsprint_kgs: number;
  plate_consumption: number;
  remarks: string;
  record_date: string;
  created_at: Date;
}

export async function addRecord(record: ProductionRecord): Promise<ProductionRecord> {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const query = `
      INSERT INTO production_records (
        user_id, publication_id, custom_publication_name, po_number,
        color_pages, bw_pages, total_pages, machine_id, lprs_time, page_start_time,
        page_end_time, newsprint_id, newsprint_kgs,
        plate_consumption, remarks, record_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
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
      record.remarks,
      record.record_date,
    ];

    console.log('Executing query with values:', values);
    const [result]: any = await conn.query(query, values);
    
    const recordId = result.insertId;
    console.log('Record inserted successfully. Insert ID:', recordId);

    // Insert downtime entries if provided
    if (record.downtime_entries && record.downtime_entries.length > 0) {
      const downtimeQuery = `
        INSERT INTO downtime_entries (production_record_id, downtime_reason_id, downtime_duration)
        VALUES (?, ?, ?)
      `;

      for (const entry of record.downtime_entries) {
        const downtimeValues = [recordId, entry.downtime_reason_id, entry.downtime_duration];
        await conn.query(downtimeQuery, downtimeValues);
        console.log('Downtime entry inserted:', downtimeValues);
      }
    }

    return { 
      ...record, 
      id: recordId,
      created_at: new Date(),
    };
  } catch (error: any) {
    console.error('❌ FULL ERROR:', error.message);
    console.error('❌ SQL State:', error.sqlState);
    console.error('❌ SQL Code:', error.code);
    throw new Error(`Database insert failed: ${error.message}`);
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function getAllRecords(): Promise<ProductionRecord[]> {
  const conn = await pool.getConnection();
  
  try {
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
          downtime_entries: downtimeEntries && Array.isArray(downtimeEntries) ? downtimeEntries : [],
        };
      })
    );

    return recordsWithDowntime;
  } finally {
    conn.release();
  }
}

export async function getRecordsByFilter(filter: {
  startDate?: string;
  endDate?: string;
  publication_id?: number;
  userId?: number;
}): Promise<ProductionRecord[]> {
  let conn;
  try {
    conn = await pool.getConnection();
    
    let query = 'SELECT * FROM production_records WHERE 1=1';
    const values: any[] = [];

    if (filter.startDate) {
      query += ' AND DATE(record_date) >= ?';
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      query += ' AND DATE(record_date) <= ?';
      values.push(filter.endDate);
    }
    if (filter.publication_id) {
      query += ' AND publication_id = ?';
      values.push(filter.publication_id);
    }
    if (filter.userId) {
      query += ' AND user_id = ?';
      values.push(filter.userId);
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    const [rows] = await conn.query(query, values);
    return rows as ProductionRecord[];
  } catch (error) {
    console.error('Database error in getRecordsByFilter:', error);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function getRecordById(id: number): Promise<ProductionRecord | undefined> {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows]: any = await conn.query('SELECT * FROM production_records WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.error('Database error in getRecordById:', error);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing pool:', error);
  }
}