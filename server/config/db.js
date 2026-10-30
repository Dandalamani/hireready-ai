const { Pool } = require('pg');
require('dotenv').config();

const isProduction = !!process.env.DATABASE_URL;

let pgPool = null;
let mysqlPool = null;

if (isProduction) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
  rejectUnauthorized: false,
  sslmode: 'verify-full',
},
    max: 10,
  });
  console.log('✅ Connected to Neon PostgreSQL');
} else {
  const mysql = require('mysql2/promise');
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
  console.log('✅ Connected to local MySQL');
}

// Convert MySQL ? placeholders to PostgreSQL $1, $2...
const convertQuery = (sql) => {
  let count = 0;
  return sql
    .replace(/\?/g, () => `$${++count}`)
    .replace(/`/g, '"');
};

// Main query function
const query = async (sql, params = []) => {
  if (isProduction) {
    const converted = convertQuery(sql);
    try {
      const result = await pgPool.query(converted, params);
      // Return [rows, {rowCount, fields}] so UPDATE/DELETE rowCount is accessible
      return [result.rows, { rowCount: result.rowCount, fields: result.fields }];
    } catch (err) {
      console.error('❌ PG Query error:', err.message);
      console.error('SQL:', converted);
      throw err;
    }
  } else {
    return mysqlPool.query(sql, params);
  }
};

// Transaction connection
const getConnection = async () => {
  if (isProduction) {
    const client = await pgPool.connect();
    let paramCount = 0;

    return {
query: async (sql, params = []) => {
  paramCount = 0;
  const converted = sql
    .replace(/\?/g, () => `$${++paramCount}`)
    .replace(/`/g, '"');
  try {
    const result = await client.query(converted, params);
    return [result.rows, { rowCount: result.rowCount, fields: result.fields }];
  } catch (err) {
    console.error('❌ PG Transaction query error:', err.message);
    throw err;
  }
},
      beginTransaction: async () => {
        paramCount = 0;
        await client.query('BEGIN');
      },
      commit: async () => client.query('COMMIT'),
      rollback: async () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  } else {
    return mysqlPool.getConnection();
  }
};

// Test connection on startup
const testConnection = async () => {
  try {
    if (isProduction) {
      await pgPool.query('SELECT 1');
      console.log('✅ Neon DB connection verified');
    }
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
  }
};

testConnection();

module.exports = { query, getConnection };