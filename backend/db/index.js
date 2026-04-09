import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
//index.js is the main file for database connection and query execution using pg library. It sets up a connection pool to the PostgreSQL database and provides a query function for executing SQL queries. It also includes error handling for database connection and query execution errors.
const { Pool } = pkg;
const databaseUrl = process.env.DATABASE_URL;

function requiresSsl(connectionString = '') {
  return connectionString.includes('supabase.com') || connectionString.includes('pooler.supabase.com');
}

function formatDbError(err) {
  if (!err) return 'Unknown database error';
  if (err.message) return err.message;
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors.map((entry) => entry.message).filter(Boolean).join(' | ');
  }
  return String(err);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: requiresSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
});

pool.connect()
  .then(() => console.log('PostgreSQL connected'))
  .catch((err) => console.error('PostgreSQL connection error:', formatDbError(err)));

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', formatDbError(err));
});

export default pool;
