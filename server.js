const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_NAME = 'TP To-Do App';
const ENV = process.env.NODE_ENV || 'development';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Les tâches sont gardées en mémoire (suffisant pour le TP)
let tasks = [];
let nextId = 1;

// Route de santé (utile pour Docker / Kubernetes)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: APP_NAME,
    environment: ENV,
    hostname: require('os').hostname(), // nom du Pod sous Kubernetes
    uptime: Math.round(process.uptime())
  });
});

// Informations d'identification de l'application
app.get('/api/info', (req, res) => {
  res.json({
    app: APP_NAME,
    environment: ENV,
    hostname: require('os').hostname(),
    port: PORT
  });
});

// API des tâches
app.get('/api/tasks', (req, res) => res.json(tasks));

app.post('/api/tasks', (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  const task = { id: nextId++, title, done: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Introuvable' });
  task.done = !task.done;
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  res.status(204).end();
});

// "0.0.0.0" : indispensable pour être accessible depuis l'extérieur (Docker, VM)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`${APP_NAME} démarrée sur le port ${PORT} (${ENV})`);
});
