const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const app = express();

// ✅ Keep raw body for proxy
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use(cors({
  origin: [
    'https://sparrow.nivakaran.dev',
    'http://localhost:3000',
    'http://nivakaran.dev'
  ],
  credentials: true
}));
app.use(cookieParser());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
})

// --- Auth check (this needs JSON, so re-parse safely) ---
app.get('/check-cookie', (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ role: decoded.role, id: decoded.id });
  } catch (err) {
    console.error('Error verifying token:', err.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
});

app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none'
  });
  res.json({ message: 'Logged out successfully!' });
});

app.get('/', (req, res) => res.json({ message: "Sparrow: API Gateway" }));
app.get('/health', (req, res) => res.json({ message: "API Gateway is running.." }));

// --- Proxy helper ---
const proxyRequest = async (req, res, targetUrl) => {
  try {
    const path = req.originalUrl.replace(/^\/api\/[^\/]+/, '') || '/';
    const url = new URL(path, targetUrl);

    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['content-length'];
    delete headers['connection'];

    const fetchOptions = { method: req.method, headers };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req.body.length ? req.body : undefined; // raw body
    }

    console.log(`Proxying ${req.method} ${req.originalUrl} -> ${url.toString()}`);

    const response = await fetch(url.toString(), fetchOptions);

    res.status(response.status);
    // forward cookies
    if (response.headers.get('set-cookie')) {
      res.setHeader('set-cookie', response.headers.get('set-cookie'));
    }
    // stream back response
    response.body.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message,
      details: error.cause?.message
    });
  }
};

// --- Proxy routes ---
app.use('/api/consolidations', (req, res) =>
  proxyRequest(req, res, process.env.CONSOLIDATION_SERVICE_URL || 'https://consolidation-service.vercel.app')
);
app.use('/api/deliveries', (req, res) =>
  proxyRequest(req, res, process.env.CONSOLIDATION_SERVICE_URL || 'https://consolidation-service.vercel.app')
);
app.use('/api/pricing', (req, res) =>
  proxyRequest(req, res, process.env.CONSOLIDATION_SERVICE_URL || 'https://pricing-service-nu.vercel.app/')
);
app.use('/api/parcels', (req, res) =>
  proxyRequest(req, res, process.env.PARCEL_SERVICE_URL || 'https://parcel-service-sigma.vercel.app')
);
app.use('/api/users', (req, res) =>
  proxyRequest(req, res, process.env.USER_SERVICE_URL || 'https://user-service-tau.vercel.app')
);
app.use('/api/warehouses', (req, res) =>
  proxyRequest(req, res, process.env.WAREHOUSE_SERVICE_URL || 'https://warehouse-service-seven.vercel.app')
);
app.use('/api/notifications', (req, res) =>
  proxyRequest(req, res, process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service-indol.vercel.app')
);
app.use('/api/preferences', (req, res) =>
  proxyRequest(req, res, process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service-indol.vercel.app')
);

// --- Error handlers ---
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack || err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;