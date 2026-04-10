/**
 * Single DB entry point — re-exports the shared pool from ../db/index.js
 * so this file never creates a second connection pool.
 */
export { query, default } from '../db/index.js';
