require('dotenv').config();
const express = require('express');
const { initDb } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
app.use(express.json());

app.use('/tasks', taskRoutes);

app.get('/health', (req, res) => res.json({ status: 'task-service is running' }));

const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Task service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize task-service DB:', err.message);
    process.exit(1);
  });
