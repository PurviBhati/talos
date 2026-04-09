
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const res = await pool.query(
      "SELECT id, sender, body, timestamp, source_id, approval_status FROM teams_messages WHERE timestamp >= NOW() - INTERVAL '7 days' ORDER BY timestamp DESC LIMIT 20;"
    );
    console.log(`Total messages in last 7 days: ${res.rows.length}`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
