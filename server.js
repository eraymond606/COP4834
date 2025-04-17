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
// ─── MENU CATEGORIES ─────────────────────────────────────────────────────────
app.get('/api/menu_categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT category_id, category_name FROM menu_categories'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching menu categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── INGREDIENTS ─────────────────────────────────────────────────────────────
app.get('/api/ingredients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT ingredient_id, ingredient_name FROM ingredients'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching ingredients:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── MENU ITEMS ──────────────────────────────────────────────────────────────
// List all items
app.get('/api/menu_items', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT food_id, item_name, category_id, price FROM menu_items'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE a menu item + upsert ingredients + link them
app.post('/api/menu_items', async (req, res) => {
  const { item_name, category_id, ingredient_names, price } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) insert menu_items with price
    const itemResult = await client.query(
      `INSERT INTO menu_items (item_name, category_id, price)
       VALUES ($1, $2, $3) RETURNING food_id`,
      [item_name, category_id, price]
    );
    const food_id = itemResult.rows[0].food_id;

    // 2) for each tag: find or create ingredient, then link
    for (let name of ingredient_names) {
      // a) check existing
      let ingRes = await client.query(
        `SELECT ingredient_id
           FROM ingredients
          WHERE ingredient_name = $1
          LIMIT 1`,
        [name]
      );
      let ingredient_id;
      if (ingRes.rowCount) {
        ingredient_id = ingRes.rows[0].ingredient_id;
      } else {
        // b) insert new
        const newIng = await client.query(
          `INSERT INTO ingredients (ingredient_name)
           VALUES ($1)
           RETURNING ingredient_id`,
          [name]
        );
        ingredient_id = newIng.rows[0].ingredient_id;
      }

      // c) link it
      await client.query(
        `INSERT INTO menu_item_ingredients (food_id, ingredient_id)
         VALUES ($1, $2)`,
        [food_id, ingredient_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ food_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating menu item + ingredients:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Update item (name, category, ingredients, and price)
app.put('/api/menu_items/:food_id', async (req, res) => {
  const { food_id } = req.params;
  const { item_name, category_id, ingredient_names, price } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE menu_items
         SET item_name=$1, category_id=$2, price=$3
       WHERE food_id=$4`,
      [item_name, category_id, price, food_id]
    );

    // remove old links
    await client.query('DELETE FROM menu_item_ingredients WHERE food_id=$1', [
      food_id,
    ]);

    // Re-insert new ingredients (similar to the create route)
    for (let name of ingredient_names) {
      // check existing
      let ingRes = await client.query(
        `SELECT ingredient_id
         FROM ingredients
         WHERE ingredient_name = $1
         LIMIT 1`,
        [name]
      );
      let ingredient_id;
      if (ingRes.rowCount) {
        ingredient_id = ingRes.rows[0].ingredient_id;
      } else {
        // insert new
        const newIng = await client.query(
          `INSERT INTO ingredients (ingredient_name)
           VALUES ($1)
           RETURNING ingredient_id`,
          [name]
        );
        ingredient_id = newIng.rows[0].ingredient_id;
      }

      // link it
      await client.query(
        `INSERT INTO menu_item_ingredients (food_id, ingredient_id)
         VALUES ($1, $2)`,
        [food_id, ingredient_id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Menu item updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating menu item:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete a menu item
app.delete('/api/menu_items/:food_id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_items WHERE food_id=$1', [
      req.params.food_id,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── MENU ITEM INGREDIENTS ───────────────────────────────────────────────────
// List all links
app.get('/api/menu_item_ingredients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT food_id, ingredient_id FROM menu_item_ingredients'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching item–ingredient links:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all links for one item
app.delete('/api/menu_item_ingredients/by-item/:food_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_item_ingredients WHERE food_id=$1', [
      req.params.food_id,
    ]);
    res.json({ message: 'Links removed' });
  } catch (err) {
    console.error('Error deleting links:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new link
app.post('/api/menu_item_ingredients', async (req, res) => {
  const { food_id, ingredient_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO menu_item_ingredients (food_id, ingredient_id)
       VALUES ($1, $2)`,
      [food_id, ingredient_id]
    );
    res.status(201).json({ message: 'Linked' });
  } catch (err) {
    console.error('Error linking ingredient:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
