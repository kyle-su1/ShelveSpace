import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "kylesu",
  host: "localhost",
  database: "booklist",
  port: 5432,
});

export default pool;
