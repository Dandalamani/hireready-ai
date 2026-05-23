const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (isProduction || process.env.DATABASE_URL) {
  // Neon PostgreSQL (production)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  console.log('✅ Using Neon PostgreSQL');
} else {
  // Local MySQL (development)
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
  console.log('✅ Using local MySQL');
}

// Unified query interface
const query = async (sql, params = []) => {
  if (process.env.DATABASE_URL || isProduction) {
    // PostgreSQL — convert ? to $1, $2...
    let pgSQL = sql;
    let paramIndex = 1;
    pgSQL = pgSQL.replace(/\?/g, () => `$${paramIndex++}`);

    // Convert MySQL backticks to PostgreSQL double quotes
    pgSQL = pgSQL.replace(/`/g, '"');

    const result = await pool.query(pgSQL, params);
    return [result.rows, result.fields];
  } else {
    // MySQL
    return pool.query(sql, params);
  }
};

// getConnection for transactions
const getConnection = async () => {
  if (process.env.DATABASE_URL || isProduction) {
    // PostgreSQL transaction wrapper
    const client = await pool.connect();
    return {
      query: async (sql, params = []) => {
        let pgSQL = sql.replace(/\?/g, (_, i) => {
          let idx = 0;
          sql.slice(0, sql.indexOf('?')).replace(/\?/g, () => { idx++; return '?'; });
          return `$${++pgSQL._paramCount}`;
        });
        pgSQL._paramCount = 0;
        let count = 0;
        const converted = sql.replace(/\?/g, () => `$${++count}`).replace(/`/g, '"');
        return client.query(converted, params).then(r => [r.rows, r.fields]);
      },
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  } else {
    return pool.getConnection();
  }
};

module.exports = { query, getConnection };