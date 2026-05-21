import dotenv from 'dotenv';
import { cleanEnv, str, port, num, bool } from 'envalid';

dotenv.config();

if (!process.env.JWT_ACCESS_SECRET && process.env.JWT_SECRET_KEY) {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET_KEY;
}

if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET_KEY) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET_KEY;
}

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3000 }),
  BACKEND_PORT: port({ default: 3000 }),
  FRONTEND_PORT: port({ default: 8080 }),
  ENVIRONMENT: str({ default: 'development' }),
  DATABASE_URL: str(),
  REDIS_URL: str(),
  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRES_IN: str({ default: '15m' }),
  REFRESH_TOKEN_DAYS: num({ default: 7 }),
  EMAIL_VERIFICATION_TOKEN_MINUTES: num({ default: 30 }),
  PASSWORD_RESET_TOKEN_MINUTES: num({ default: 15 }),
  RESERVATION_TTL_MINUTES: num({ default: 15 }),
  CORS_ORIGINS: str({ default: 'http://localhost:8080,http://localhost:5173,http://localhost:3000' }),
  APP_BASE_URL: str({ default: 'http://localhost:3000' }),
  FRONTEND_BASE_URL: str({ default: 'http://localhost:8080' }),
  ENABLE_WORKER: bool({ default: true }),
  DEAD_STOCK_CRON_MINUTES: num({ default: 60 }),
  DEAD_STOCK_AGE_DAYS: num({ default: 30 }),
  DEAD_STOCK_DECAY_PERCENT: num({ default: 10 }),
  DEAD_STOCK_DECAY_INTERVAL_HOURS: num({ default: 72 }),
  EMAIL_PROVIDER: str({ choices: ['mock', 'resend', 'smtp'], default: process.env.NODE_ENV === 'test' ? 'mock' : 'smtp' }),
  EMAIL_FROM: str({ default: process.env.EMAIL_FROM_ADDRESS || 'LeanStock <no-reply@leanstock.local>' }),
  EMAIL_FROM_ADDRESS: str({ default: 'no-reply@leanstock.local' }),
  EMAIL_API_KEY: str({ default: '' }),
  RESEND_API_KEY: str({ default: process.env.EMAIL_API_KEY || '' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: port({ default: 587 }),
  SMTP_SECURE: bool({ default: false }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  EMAIL_QUEUE_ATTEMPTS: num({ default: 3 }),
  SUPERADMIN_SETUP_KEY: str({ default: 'local-super-admin-setup-key' })
});

if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT secrets must be at least 32 characters long.');
}

if (env.NODE_ENV !== 'test' && env.EMAIL_PROVIDER === 'mock') {
  throw new Error('EMAIL_PROVIDER=mock is allowed only for automated tests. Use EMAIL_PROVIDER=smtp or EMAIL_PROVIDER=resend for local defense and production so emails arrive in a real inbox.');
}

if (env.NODE_ENV !== 'test' && env.EMAIL_PROVIDER === 'smtp') {
  const missingSmtp = [];
  if (!env.SMTP_HOST) missingSmtp.push('SMTP_HOST');
  if (!env.SMTP_USER) missingSmtp.push('SMTP_USER');
  if (!env.SMTP_PASS) missingSmtp.push('SMTP_PASS');
  if (missingSmtp.length) {
    throw new Error(`EMAIL_PROVIDER=smtp requires ${missingSmtp.join(', ')}. Configure your .env with a real Gmail App Password or another SMTP provider.`);
  }
}

if (env.NODE_ENV !== 'test' && env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
  throw new Error('EMAIL_PROVIDER=resend requires RESEND_API_KEY or EMAIL_API_KEY.');
}

export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);

if (env.NODE_ENV === 'production' && corsOrigins.includes('*')) {
  throw new Error('Wildcard CORS origin is not allowed in production.');
}
