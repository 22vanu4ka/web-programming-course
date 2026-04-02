import { Hono } from 'hono';
import auth from '../../routes/auth.js';
import { sessions } from '../../routes/sessions.js';
import { admin } from '../../routes/admin.js';

export const createTestApp = () => {
  const app = new Hono();
  app.route('/api/auth', auth);
  app.route('/api/sessions', sessions);
  app.route('/api/admin', admin);
  return app;
};