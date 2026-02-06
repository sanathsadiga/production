import express, { Request, Response } from 'express';
import { ALL_USERS } from '../constants';

const router = express.Router();

// Login endpoint (hardcoded authentication)
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user by email and password
  const user = ALL_USERS.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Return user data (without password)
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone_number: user.phone_number,
    location: user.location,
    location_code: user.location_code,
    role: user.role,
  });
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// Get user by ID
router.get('/user/:id', (req: Request, res: Response) => {
  const user = ALL_USERS.find(u => u.id === parseInt(req.params.id));

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Return user data (without password)
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone_number: user.phone_number,
    location: user.location,
    location_code: user.location_code,
    role: user.role,
  });
});

export default router;
