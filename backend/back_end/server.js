// This file is no longer used as the main entry point.
// The application now runs from /backend/app.js instead.
// This file is kept for reference only.

import express from 'express';
import db from './database.js';

const app = express();

// Basic test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint' });
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT 1');
    res.json({ message: 'Database connection successful', data: rows });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

export default app;