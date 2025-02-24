const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// API Endpoints
const { Pool } = require('pg');

const pool = new Pool({
  user: 'cop4834_project_db_user',
  host: 'dpg-cudvmvlumphs73a07rv0-a.virginia-postgres.render.com',
  database: 'cop4834_project_db',
  password: 'VWh52Dx6UZEAvOoOtK3FELqwPU4X9l4P',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require',
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

app.get('/api/employees', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT pin, first_name, last_name FROM employees'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      message: 'Server error fetching employees',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

app.get('/api/jobcodes', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT job_code_id, code_name, code_description FROM job_codes'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching job codes:', error);
    res.status(500).json({
      message: 'Server error fetching job codes',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

app.get('/api/employee_job_codes', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT pin, job_code_id FROM employee_job_codes'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employee job codes:', error);
    res.status(500).json({
      message: 'Server error fetching employee job codes',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

app.post('/api/employees', async (req, res) => {
  const { first_name, last_name, job_code_id } = req.body;
  if (!first_name || !last_name || !job_code_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertEmployeeQuery = `
      INSERT INTO employees (first_name, last_name)
      VALUES ($1, $2)
      RETURNING pin
    `;
    const employeeResult = await client.query(insertEmployeeQuery, [
      first_name,
      last_name,
    ]);
    const newPin = employeeResult.rows[0].pin;
    const insertEmployeeJobCodeQuery = `
      INSERT INTO employee_job_codes (pin, job_code_id)
      VALUES ($1, $2)
    `;
    await client.query(insertEmployeeJobCodeQuery, [newPin, job_code_id]);
    await client.query('COMMIT');
    res.status(201).json({ pin: newPin });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  } finally {
    client.release();
  }
});

// Serve static assets from the React app build
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all: serve index.html for any other GET request (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server using the environment's PORT or 5000 as fallback
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

