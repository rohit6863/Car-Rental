'use strict';
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const hpp          = require('hpp');
const path         = require('path');

const { errorHandler }    = require('./middleware/errorHandler');
const { csrfMiddleware }  = require('./middleware/csrf');

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const vehicleRoutes     = require('./routes/vehicles.routes');
const brandRoutes       = require('./routes/brands.routes');
const bookingRoutes     = require('./routes/bookings.routes');
const paymentRoutes     = require('./routes/payments.routes');
const userRoutes        = require('./routes/users.routes');
const pageRoutes        = require('./routes/pages.routes');
const contactRoutes     = require('./routes/contact.routes');
const newsletterRoutes  = require('./routes/newsletter.routes');

// Admin routes
const adminStatsRoutes       = require('./routes/admin/stats.routes');
const adminVehicleRoutes     = require('./routes/admin/vehicles.routes');
const adminBrandRoutes       = require('./routes/admin/brands.routes');
const adminBookingRoutes     = require('./routes/admin/bookings.routes');
const adminPaymentRoutes     = require('./routes/admin/payments.routes');
const adminUserRoutes        = require('./routes/admin/users.routes');
const adminQueryRoutes       = require('./routes/admin/queries.routes');
const adminSubscriberRoutes  = require('./routes/admin/subscribers.routes');
const adminPageRoutes        = require('./routes/admin/pages.routes');
const adminContactInfoRoutes = require('./routes/admin/contactInfo.routes');
const adminAuthRoutes        = require('./routes/admin/auth.routes');

const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// ─── Security headers ──────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", 'https://checkout.razorpay.com', 'https://accounts.google.com'],
      frameSrc:   ["'self'", 'https://api.razorpay.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.razorpay.com', 'https://accounts.google.com'],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      objectSrc:  ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5175')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

// ─── Body parsing & Parameter pollution prevention ────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(hpp());
app.use(cookieParser());

// ─── Static uploads (served with strict nosniff & no-exec CSP) ────────────────
app.use('/uploads', (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use('/uploads/vehicles', express.static(path.join(__dirname, '..', 'uploads', 'vehicles')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads', 'vehicles')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── CSRF (double-submit cookie) ──────────────────────────────────────────────
// Webhook endpoints must read raw body; they skip CSRF and body-parser.
app.use((req, _res, next) => {
  // Razorpay webhook uses raw body – handled in its own router before json().
  if (req.path === '/api/payments/razorpay/webhook') return next();
  csrfMiddleware(req, _res, next);
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes);
app.use('/api/vehicles',          vehicleRoutes);
app.use('/api/brands',            brandRoutes);
app.use('/api/bookings',          bookingRoutes);
app.use('/api/payments',          paymentRoutes);
app.use('/api/users',             userRoutes);
app.use('/api/pages',             pageRoutes);
app.use('/api/contact',           contactRoutes);
app.use('/api/newsletter',        newsletterRoutes);

// Admin
app.use('/api/admin',             adminAuthRoutes);
app.use('/api/admin/auth',        adminAuthRoutes);
app.use('/api/admin/stats',       adminStatsRoutes);
app.use('/api/admin/vehicles',    adminVehicleRoutes);
app.use('/api/admin/brands',      adminBrandRoutes);
app.use('/api/admin/bookings',    adminBookingRoutes);
app.use('/api/admin/payments',    adminPaymentRoutes);
app.use('/api/admin/users',       adminUserRoutes);
app.use('/api/admin/queries',     adminQueryRoutes);
app.use('/api/admin/subscribers', adminSubscriberRoutes);
app.use('/api/admin/pages',       adminPageRoutes);
app.use('/api/admin/contact-info',adminContactInfoRoutes);

// ─── 404 catch ────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
