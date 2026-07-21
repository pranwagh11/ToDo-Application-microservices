require('dotenv').config();
const express = require('express');
const { initDb } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'auth-service is running' }));

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize auth-service DB:', err.message);
    process.exit(1);
  });
