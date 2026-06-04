// backend/config/env.js
'use strict';

import dotenv from 'dotenv';
dotenv.config();

const REQUIRED = [
  'MONGO_URI',
  'JWT_SECRET',
  'ADMIN_SECRET',
];

const OPTIONAL_WITH_DEFAULTS = {
  PORT: '3000',
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:5173',
  PAYMENT_CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RAZORPAY_WEBHOOK_SECRET: '',
  SMTP_HOST: '',
  SMTP_PORT: '465',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: '"LOFT E-commerce" <noreply@loft-premium.com>',
};

const missing = REQUIRED.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const env = {
  PORT: parseInt(process.env.PORT || OPTIONAL_WITH_DEFAULTS.PORT, 10),
  NODE_ENV: process.env.NODE_ENV || OPTIONAL_WITH_DEFAULTS.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  CLIENT_URL: process.env.CLIENT_URL || OPTIONAL_WITH_DEFAULTS.CLIENT_URL,
  PAYMENT_CURRENCY: process.env.PAYMENT_CURRENCY || OPTIONAL_WITH_DEFAULTS.PAYMENT_CURRENCY,
  CURRENCY_SYMBOL: process.env.CURRENCY_SYMBOL || OPTIONAL_WITH_DEFAULTS.CURRENCY_SYMBOL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || OPTIONAL_WITH_DEFAULTS.SMTP_PORT, 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || OPTIONAL_WITH_DEFAULTS.SMTP_FROM,
  IS_PRODUCTION: (process.env.NODE_ENV || '').toLowerCase() === 'production',
};

export default env;
