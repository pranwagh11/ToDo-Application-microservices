const transporter = require('../config/mailer');
const { successResponse, errorResponse } = require('../../shared/utils');
const { HTTP_STATUS } = require('../../shared/constants');

async function sendEmail(req, res) {
  try {
    const { to, subject, message, html } = req.body;

    if (!to || !subject || (!message && !html)) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'to, subject and (message or html) are required');
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text: message || undefined,
      html: html || undefined,
    });

    return successResponse(res, HTTP_STATUS.OK, 'Email sent successfully');
  } catch (err) {
    console.error('Send email error:', err.message);
    return errorResponse(res, HTTP_STATUS.SERVER_ERROR, 'Failed to send email');
  }
}

module.exports = { sendEmail };
