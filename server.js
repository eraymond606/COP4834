const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');

// Middleware
app.use(cors({
  origin: 'https://cop4834-project-frontend.onrender.com'
}));

app.use(express.json());

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

app.post('/admin/login', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { username, password } = req.body;
    const numericPin = parseInt(username, 10);
    console.log('Parsed admin_pin:', numericPin, 'Password:', password);

    // Get the stored hashed password
    const query = `
          SELECT * FROM admin_login
          WHERE admin_pin = $1
          LIMIT 1
        `;
    const result = await pool.query(query, [numericPin]);
    console.log(
      'Query result rowCount:',
      result.rowCount,
      'Rows:',
      result.rows
    );

    if (result.rowCount === 0) {
      console.log('No user found with that PIN');
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Compare password with hashed version
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log('Password does not match');
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = 'abc123fakeToken';
    console.log('Login successful');
    return res.json({ token, message: 'Login successful!' });
  } catch (error) {
    console.error('Error in /admin/login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

//API Endpoint to get employees
// Route to get all employees
app.get('/api/employees', async (req, res) => {
  console.log('Incoming request body:', req.body);
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
  const { first_name, last_name, job_code_id, password } = req.body;

  // Validate incoming data
  if (!first_name || !last_name || typeof job_code_id !== 'number') {
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

    if (job_code_id === 0 && password) {
      const hashedPassword = await bcrypt.hash(password, 10); // ✅ Hash password
      const insertAdminQuery = `
        INSERT INTO admin_login (admin_pin, password)
        VALUES ($1, $2)
      `;
      await client.query(insertAdminQuery, [newPin, hashedPassword]);
    }

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

// Delete employee job codes route
app.delete('/api/employee_job_codes/:pin', async (req, res) => {
  const { pin } = req.params;
  const client = await pool.connect();

  try {
    const deleteQuery = 'DELETE FROM employee_job_codes WHERE pin = $1';
    const result = await client.query(deleteQuery, [pin]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Employee job codes not found.' });
    }

    res.json({ message: `Removed job codes for employee pin: ${pin}` });
  } catch (error) {
    console.error('Error deleting employee job codes:', error);
    res
      .status(500)
      .json({ message: 'Server error deleting employee job codes' });
  } finally {
    client.release();
  }
});

app.delete('/api/employees/:pin', async (req, res) => {
  const { pin } = req.params;
  const client = await pool.connect();

  try {
    // First delete employee from "employees" table
    const deleteEmployeeQuery = 'DELETE FROM employees WHERE pin = $1';
    const result = await client.query(deleteEmployeeQuery, [pin]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    res.json({ message: `Employee with pin ${pin} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Server error deleting employee.' });
  } finally {
    client.release();
  }
});

// Edit employee
app.put('/api/employees/:pin', async (req, res) => {
  const { pin } = req.params;
  const { first_name, last_name } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    const updateQuery = `
      UPDATE employees
      SET first_name = $1, last_name = $2
      WHERE pin = $3
    `;
    const result = await client.query(updateQuery, [
      first_name,
      last_name,
      pin,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    res.json({ message: 'Employee updated successfully.' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  } finally {
    client.release();
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
