import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for AWS RDS
  },
});

// Test connection on startup
pool.query("SELECT NOW()")
  .then(() => console.log("✅ Connected to AWS RDS"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));

export default pool;