import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mmcl_production',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
pool.getConnection()
  .then((connection) => {
    console.log('✅ Connected to MySQL database');
    connection.release();
  })
  .catch((err: any) => {
    console.error('❌ Database connection error:', err.message);
  });

export default pool;
