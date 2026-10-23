const { Pool } = require('pg');

const pool = new Pool({
  max: 5,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000
});

pool.on('error', (error) => {
  console.error(JSON.stringify({
    level: 'error',
    event: 'database_pool_error',
    code: error.code
  }));
});

module.exports = pool;
