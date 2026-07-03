require('dotenv').config();
const express = require('express');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.use(express.json());

app.use('/notify', notificationRoutes);

app.get('/health', (req, res) => res.json({ status: 'notification-service is running' }));

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
