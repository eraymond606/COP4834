const express = require('express');
const cors = require('cors');
const app = express();

//Middleware
app.use(cors());
app.use(express.json()); //Parse JSON bodies

//Database setup
const { Pool } = require('pg');
const pool = new Pool({
  user: 'cop4834_project_db_user',
  host: 'dpg-cudvmvlumphs73a07rv0-a.virginia-postgres.render.com',
  database: 'cop4834_project_db',
  password: 'VWh52Dx6UZEAvOoOtK3FELqwPU4X9l4P',
  port: 5432,
});

app.post('/admin/login', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { username, password } = req.body;

    const text = `
      SELECT * 
      FROM admin_login
      WHERE admin_pin = $1::int
        AND password = $2
      LIMIT 1
    `;
    const values = [username, password];
    const result = await pool.query(text, values);

    if (result.rowCount === 1) {
      //Message and fake token
      const token = 'abc123fakeToken';
      return res.json({
        token,
        message: 'Login successful!',
      });
    } else {
      return res.status(401).json({
        message: 'Invalid username or password',
      });
    }
  } catch (error) {
    console.error('Error in /admin/login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
