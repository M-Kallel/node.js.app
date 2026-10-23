const express = require('express');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const pool = require('./database');

const app = express();
const APP_NAME = 'TP To-Do App';

app.disable('x-powered-by');

app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      level: 'info',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start
    }));
  });
  next();
});

app.use(express.json({ limit: '16kb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const asyncRoute = handler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function validId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }
  req.taskId = id;
  next();
}

app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    app: APP_NAME,
    environment: process.env.NODE_ENV || 'development',
    hostname: os.hostname(),
    uptime: Math.round(process.uptime())
  });
});

app.get('/ready', asyncRoute(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await pool.query('SELECT id FROM tasks LIMIT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
}));

app.get('/api/info', (req, res) => {
  res.json({
    app: APP_NAME,
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    hostname: os.hostname(),
    port: Number(process.env.PORT || 3000),
    storage: 'PostgreSQL'
  });
});

app.get('/api/tasks', asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT id, title, done, created_at, updated_at FROM tasks ORDER BY id'
  );
  res.json(result.rows);
}));

app.post('/api/tasks', asyncRoute(async (req, res) => {
  if (typeof req.body?.title !== 'string') {
    return res.status(400).json({ error: 'Le titre doit être un texte' });
  }

  const title = req.body.title.trim();
  if (title.length < 1 || title.length > 200) {
    return res.status(400).json({
      error: 'Le titre doit contenir entre 1 et 200 caractères'
    });
  }

  const result = await pool.query(
    'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.status(201).json(result.rows[0]);
}));

app.patch('/api/tasks/:id', validId, asyncRoute(async (req, res) => {
  const hasDone = Object.prototype.hasOwnProperty.call(req.body || {}, 'done');

  if (hasDone && typeof req.body.done !== 'boolean') {
    return res.status(400).json({ error: 'done doit être un booléen' });
  }

  // Sans corps : conserve le comportement de l'interface actuelle.
  const result = hasDone
    ? await pool.query(
        'UPDATE tasks SET done=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
        [req.body.done, req.taskId]
      )
    : await pool.query(
        'UPDATE tasks SET done=NOT done, updated_at=NOW() WHERE id=$1 RETURNING *',
        [req.taskId]
      );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Tâche introuvable' });
  }
  res.json(result.rows[0]);
}));

app.delete('/api/tasks/:id', validId, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM tasks WHERE id=$1 RETURNING id',
    [req.taskId]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: 'Tâche introuvable' });
  }
  res.status(204).end();
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error(JSON.stringify({
    level: 'error',
    requestId: req.requestId,
    code: error.code,
    type: error.type
  }));

  const status = error.type === 'entity.parse.failed' ? 400
    : error.type === 'entity.too.large' ? 413 : 500;

  const message = status === 400 ? 'JSON invalide'
    : status === 413 ? 'Requête trop volumineuse'
    : 'Erreur interne du serveur';

  res.status(status).json({
    error: message,
    requestId: req.requestId
  });
});

module.exports = app;
