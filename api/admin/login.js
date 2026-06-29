const crypto = require('crypto');

const defaultAdminSessionTtlMs = 8 * 60 * 60 * 1000;

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signAdminSession(payload) {
  const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'interview-agent-local-admin-session';

  return crypto
    .createHmac('sha256', adminSessionSecret)
    .update(payload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createAdminSessionToken(session) {
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${signAdminSession(payload)}`;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  return rawBody ? JSON.parse(rawBody) : {};
}

module.exports = async function adminLogin(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = await readJsonBody(req);
    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin@123';

    if (username !== expectedUsername || password !== expectedPassword) {
      return res.status(401).json({ error: 'Invalid admin username or password' });
    }

    const createdAt = new Date();
    const adminSessionTtlMs = Number(process.env.ADMIN_SESSION_TTL_MS) || defaultAdminSessionTtlMs;
    const session = {
      username,
      role: 'admin',
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + adminSessionTtlMs).toISOString()
    };
    const token = createAdminSessionToken(session);

    return res.status(200).json({
      token,
      expiresAt: session.expiresAt,
      user: {
        username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Vercel admin login error:', error);
    return res.status(500).json({ error: 'Admin login failed' });
  }
};
