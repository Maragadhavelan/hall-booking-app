require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== AUTO-CREATE TABLES ====================
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS halls (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        capacity INTEGER DEFAULT 500,
        price_per_day DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        hall_id INTEGER REFERENCES halls(id),
        customer_name VARCHAR(200) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        event_date DATE NOT NULL,
        time_slot VARCHAR(20) NOT NULL DEFAULT 'Full Day',
        guests INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert default halls if none exist
    const { rows } = await pool.query('SELECT COUNT(*) FROM halls');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO halls (name, capacity, price_per_day) VALUES
        ('Marriage Hall 1', 500, 25000),
        ('Marriage Hall 2', 300, 18000)
      `);
      console.log('Default halls created');
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database init error:', err.message);
  }
}

// ==================== API ROUTES ====================

// Get all halls
app.get('/api/halls', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM halls ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bookings (with hall name)
app.get('/api/bookings', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, h.name as hall_name
      FROM bookings b
      JOIN halls h ON b.hall_id = h.id
      ORDER BY b.event_date DESC, b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { hall_id, customer_name, phone, event_date, time_slot, guests, notes } = req.body;

    // Validate required fields
    if (!hall_id || !customer_name || !phone || !event_date) {
      return res.status(400).json({ error: 'Please fill all required fields' });
    }

    // Check if hall is already booked for that date + time slot
    const conflict = await pool.query(
      `SELECT id, customer_name FROM bookings
       WHERE hall_id = $1 AND event_date = $2 AND time_slot = $3`,
      [hall_id, event_date, time_slot]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error: `This hall is already booked for ${event_date} (${time_slot}) by ${conflict.rows[0].customer_name}`
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO bookings (hall_id, customer_name, phone, event_date, time_slot, guests, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [hall_id, customer_name, phone, event_date, time_slot || 'Full Day', guests || 0, notes || '']
    );

    // Fetch with hall name
    const booking = await pool.query(
      `SELECT b.*, h.name as hall_name FROM bookings b JOIN halls h ON b.hall_id = h.id WHERE b.id = $1`,
      [rows[0].id]
    );

    res.status(201).json(booking.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bookings for a specific month (for calendar)
app.get('/api/bookings/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { rows } = await pool.query(
      `SELECT b.*, h.name as hall_name
       FROM bookings b
       JOIN halls h ON b.hall_id = h.id
       WHERE EXTRACT(YEAR FROM b.event_date) = $1 AND EXTRACT(MONTH FROM b.event_date) = $2
       ORDER BY b.event_date`,
      [year, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await initDB();
});
