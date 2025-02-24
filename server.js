const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

//Middleware
app.use(cors());
app.use(express.json()); //Parse JSON bodies
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

//Database setup
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

async function executeQueryWithRetry(queryFn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      try {
        const result = await queryFn(client);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
  }
  throw lastError;
}

// app.post('/admin/login', async (req, res) => {
//   console.log('Request body:', req.body);
//   try {
//     const { username, password } = req.body;
//     const numericPin = parseInt(username, 10);
//     console.log('Parsed admin_pin:', numericPin, 'Password:', password);

//     const text = `
//       SELECT *
//       FROM admin_login
//       WHERE admin_pin = $1
//         AND password = $2
//       LIMIT 1
//     `;

//     const values = [numericPin, password];
//     const result = await pool.query(text, values);
//     console.log(
//       'Query result rowCount:',
//       result.rowCount,
//       'Rows:',
//       result.rows
//     );

//     if (result.rowCount === 1) {
//       //Message and fake token
//       const token = 'abc123fakeToken';
//       return res.json({
//         token,
//         message: 'Login successful!',
//       });
//     } else {
//       return res.status(401).json({
//         message: 'Invalid username or password',
//       });
//     }
//   } catch (error) {
//     console.error('Error in /admin/login:', error);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

//API Endpoint to get employees
// Route to get all employees
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

// Route to get all job codes
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

// Route to get all employee-job code mappings
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

//Insert employee records
app.post('/api/employees', async (req, res) => {
  const { first_name, last_name, job_code_id } = req.body;

  // Validate incoming data
  if (!first_name || !last_name || !job_code_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the employee into the employees table
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

    // Assign that employee to the specified job code
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

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
