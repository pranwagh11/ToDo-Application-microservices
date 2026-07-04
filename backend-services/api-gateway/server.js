require('dotenv').config();
const express = require('express');
const cors = require('cors');
const proxyRoutes = require('./routes/proxyRoutes');

const app = express();

// Frontend is served from its own static origin (e.g. http://localhost:8080),
// so the gateway needs CORS enabled for it to call /auth, /tasks, /notify.
app.use(cors());

// NOTE: body parsing is intentionally NOT applied globally here, because
// http-proxy-middleware needs to forward the raw request stream. Parsing
// the body at the gateway and then proxying would hang/break the request.

app.get('/health', (req, res) => res.json({ status: 'api-gateway is running' }));

app.use('/', proxyRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`-> /auth   -> ${process.env.AUTH_SERVICE_URL}`);
  console.log(`-> /tasks  -> ${process.env.TASK_SERVICE_URL}`);
  console.log(`-> /notify -> ${process.env.NOTIFICATION_SERVICE_URL}`);
});
