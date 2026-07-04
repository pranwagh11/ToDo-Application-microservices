const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const router = express.Router();

// Pure reverse-proxy: forwards requests as-is, including the Authorization
// header, to the relevant downstream service. Each service still verifies
// the JWT itself (defense in depth) since the gateway does no auth logic.

router.use(
  '/auth',
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  })
);

router.use(
  '/tasks',
  createProxyMiddleware({
    target: process.env.TASK_SERVICE_URL,
    changeOrigin: true,
  })
);

router.use(
  '/notify',
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
  })
);

module.exports = router;
