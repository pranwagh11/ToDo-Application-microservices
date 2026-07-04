const express = require('express');
const router = express.Router();
const { sendEmail } = require('../controllers/notificationController');

router.post('/email', sendEmail);

module.exports = router;
