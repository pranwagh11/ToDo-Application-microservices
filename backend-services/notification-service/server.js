require('dotenv').config();
const express = require('express');
const notificationRoutes = require('./routes/notificationRoutes');
const transporter = require("./config/mailer");

const app = express();
app.use(express.json());

app.use('/notify', notificationRoutes);

app.get('/health', (req, res) => res.json({ status: 'notification-service is running' }));

app.get("/ready", async (req, res) => {
  try {
    await transporter.verify();

    res.json({
      status: "ok",
      message: "SMTP server is ready",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: "error",
      message: "SMTP connection failed",
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
