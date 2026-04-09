
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const res = await pool.query(
      "SELECT id, sender, body, timestamp, source_id FROM teams_messages WHERE timestamp >= NOW() - INTERVAL '1 hour' ORDER BY timestamp DESC;"
    );
    console.log(`Messages in last hour: ${res.rows.length}`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
