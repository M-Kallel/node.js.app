const app = require('./src/app');
const pool = require('./src/database');

const PORT = Number(process.env.PORT || 3000);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT invalide');
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    level: 'info',
    event: 'server_started',
    port: PORT,
    version: '2.0.0'
  }));
});

server.on('error', error => {
  console.error(error.message);
  process.exit(1);
});

let stopping = false;

function shutdown(signal) {
  if (stopping) return;
  stopping = true;

  console.log(JSON.stringify({ event: 'shutdown', signal }));

  const timer = setTimeout(() => process.exit(1), 10000);
  timer.unref();

  server.close(async () => {
    try {
      await pool.end();
      clearTimeout(timer);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
