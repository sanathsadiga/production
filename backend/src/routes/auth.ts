import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { AuthRequest, auth } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Login endpoint - authenticate user from database
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log(`📝 Login attempt: ${email}`);

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const connection = await pool.getConnection();

    try {
      // Query database for user
      const [rows] = await connection.execute(
        'SELECT id, name, email, password, phone_number, location, location_code, role FROM users WHERE email = ?',
        [email]
      );

      const users = rows as any[];

      if (users.length === 0) {
        console.log(`❌ Login failed: User not found - ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];

      // Verify password with detailed logging
      console.log(`🔍 Password check for ${email}:`);
      console.log(`   Stored password: "${user.password}" (length: ${user.password.length}, type: ${typeof user.password})`);
      console.log(`   Provided password: "${password}" (length: ${password.length}, type: ${typeof password})`);
      console.log(`   Match: ${user.password === password}`);
      console.log(`   Stored bytes: ${Buffer.from(user.password).toString('hex')}`);
      console.log(`   Provided bytes: ${Buffer.from(password).toString('hex')}`);

      if (user.password !== password) {
        console.log(`❌ Login failed: Invalid password for ${email}`);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ Login successful: ${user.name} (${user.role})`);

      // Return token and user data
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone_number: user.phone_number,
          location: user.location,
          location_code: user.location_code,
          role: user.role,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
router.post('/logout', auth, (req: AuthRequest, res: Response) => {
  try {
    console.log(`✅ User ${req.user?.email} logged out`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('❌ Logout error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user - requires valid token
 * GET /api/auth/me
 */
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const connection = await pool.getConnection();

    try {
      // Query database for user
      const [rows] = await connection.execute(
        'SELECT id, name, email, phone_number, location, location_code, role FROM users WHERE id = ?',
        [req.user.id]
      );

      const users = rows as any[];

      if (users.length === 0) {
        console.log(`❌ User not found: ${req.user?.id}`);
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];
      console.log(`✅ Token verified for: ${user.name}`);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone_number: user.phone_number,
          location: user.location,
          location_code: user.location_code,
          role: user.role,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('❌ Get user error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user by ID
 * GET /api/auth/user/:id
 */
router.get('/user/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const connection = await pool.getConnection();

    try {
      // Query database
      const [rows] = await connection.execute(
        'SELECT id, name, email, phone_number, location, location_code, role FROM users WHERE id = ?',
        [userId]
      );

      const users = rows as any[];

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      // Return user data (without password)
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone_number: user.phone_number,
          location: user.location,
          location_code: user.location_code,
          role: user.role,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('❌ Get user error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
