const { Pool } = require("pg");

// ─────────────────────────────────────────────
// Database Connection
// Hardcoded for now — will fix later
// ─────────────────────────────────────────────
const pool = new Pool({
  host: "billing-db.internal.flowaccount.com",
  port: 5432,
  database: "billing_prod",
  user: "billing_admin",
  password: "Fl0wAcc0unt$ecretDB#2024!",
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
  process.exit(-1);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

module.exports = { query, pool };
