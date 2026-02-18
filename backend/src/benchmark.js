import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const TOTAL_ROWS = 100_000;
const NUM_USERS = 500;
const TEST_TABLE = "books_benchmark";

// Extract "Execution Time: X.XXX ms" from EXPLAIN ANALYZE output
async function getExecutionTime(sql, params = []) {
    // Run once to warm the cache
    await pool.query(`EXPLAIN ANALYZE ${sql}`, params);

    // Run 3 more times and average
    const times = [];
    for (let i = 0; i < 3; i++) {
        const result = await pool.query(`EXPLAIN ANALYZE ${sql}`, params);
        const lastRow = result.rows[result.rows.length - 1]["QUERY PLAN"];
        const match = lastRow.match(/Execution Time:\s+([\d.]+)\s+ms/);
        if (match) times.push(parseFloat(match[1]));
    }
    return times.reduce((a, b) => a + b, 0) / times.length;
}

async function printExplain(label, sql, params = []) {
    const result = await pool.query(`EXPLAIN ANALYZE ${sql}`, params);
    console.log(`\n  ${label}:`);
    for (const row of result.rows) {
        console.log(`    ${row["QUERY PLAN"]}`);
    }
}

async function main() {
    console.log("=".repeat(70));
    console.log("DATABASE INDEX BENCHMARK (100k rows on AWS RDS)");
    console.log("=".repeat(70));

    // 1. Create test table
    console.log(`\n[1/6] Creating test table ...`);
    await pool.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    await pool.query(`
    CREATE TABLE ${TEST_TABLE} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover TEXT,
      status TEXT DEFAULT 'to-read'
    )
  `);

    // 2. Insert 100k rows
    console.log(`[2/6] Inserting ${TOTAL_ROWS.toLocaleString()} rows ...`);
    const batchSize = 5000;
    for (let i = 0; i < TOTAL_ROWS; i += batchSize) {
        const values = [];
        const params = [];
        let paramIdx = 1;
        for (let j = 0; j < batchSize && i + j < TOTAL_ROWS; j++) {
            const userId = Math.floor(Math.random() * NUM_USERS) + 1;
            const bookNum = i + j;
            values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`);
            params.push(userId, `Book Title ${bookNum}`, `Author ${bookNum % 1000}`, bookNum % 2 === 0 ? "to-read" : "finished");
            paramIdx += 4;
        }
        await pool.query(
            `INSERT INTO ${TEST_TABLE} (user_id, title, author, status) VALUES ${values.join(", ")}`,
            params
        );
    }
    // Force planner stats
    await pool.query(`ANALYZE ${TEST_TABLE}`);
    console.log(`  Inserted ${TOTAL_ROWS.toLocaleString()} rows.\n`);

    const targetUserId = 42;
    const targetTitle = "Book Title 50000";
    const targetAuthor = "Author 0";

    const fetchSQL = `SELECT * FROM ${TEST_TABLE} WHERE user_id = $1 ORDER BY id ASC`;
    const dupSQL = `SELECT * FROM ${TEST_TABLE} WHERE user_id = $1 AND title = $2 AND author = $3`;

    // 3. BEFORE INDEXES
    console.log("=".repeat(70));
    console.log("[3/6] BEFORE INDEXES");
    console.log("=".repeat(70));

    await printExplain("Fetch user's books", fetchSQL, [targetUserId]);
    await printExplain("Duplicate check", dupSQL, [targetUserId, targetTitle, targetAuthor]);

    const beforeFetch = await getExecutionTime(fetchSQL, [targetUserId]);
    const beforeDup = await getExecutionTime(dupSQL, [targetUserId, targetTitle, targetAuthor]);

    console.log(`\n  AVG Execution Time (DB-level):`);
    console.log(`    Fetch: ${beforeFetch.toFixed(3)} ms`);
    console.log(`    Dup:   ${beforeDup.toFixed(3)} ms`);

    // 4. CREATE INDEXES
    console.log(`\n${"=".repeat(70)}`);
    console.log("[4/6] CREATING INDEXES");
    console.log("=".repeat(70));
    await pool.query(`CREATE INDEX idx_bench_user_id ON ${TEST_TABLE}(user_id)`);
    await pool.query(`CREATE INDEX idx_bench_dup ON ${TEST_TABLE}(user_id, title, author)`);
    await pool.query(`ANALYZE ${TEST_TABLE}`);
    console.log("  Indexes created and analyzed.");

    // 5. AFTER INDEXES
    console.log(`\n${"=".repeat(70)}`);
    console.log("[5/6] AFTER INDEXES");
    console.log("=".repeat(70));

    await printExplain("Fetch user's books", fetchSQL, [targetUserId]);
    await printExplain("Duplicate check", dupSQL, [targetUserId, targetTitle, targetAuthor]);

    const afterFetch = await getExecutionTime(fetchSQL, [targetUserId]);
    const afterDup = await getExecutionTime(dupSQL, [targetUserId, targetTitle, targetAuthor]);

    console.log(`\n  AVG Execution Time (DB-level):`);
    console.log(`    Fetch: ${afterFetch.toFixed(3)} ms`);
    console.log(`    Dup:   ${afterDup.toFixed(3)} ms`);

    // 6. RESULTS
    console.log(`\n${"=".repeat(70)}`);
    console.log("RESULTS (Database Execution Time)");
    console.log("=".repeat(70));

    const fetchPct = ((beforeFetch - afterFetch) / beforeFetch * 100).toFixed(1);
    const dupPct = ((beforeDup - afterDup) / beforeDup * 100).toFixed(1);

    console.log(`\n  ┌─────────────────────┬────────────┬────────────┬──────────────┐`);
    console.log(`  │ Query               │ Before     │ After      │ Improvement  │`);
    console.log(`  ├─────────────────────┼────────────┼────────────┼──────────────┤`);
    console.log(`  │ Fetch user books    │ ${beforeFetch.toFixed(3).padStart(7)} ms │ ${afterFetch.toFixed(3).padStart(7)} ms │ ${fetchPct.padStart(9)}%   │`);
    console.log(`  │ Duplicate check     │ ${beforeDup.toFixed(3).padStart(7)} ms │ ${afterDup.toFixed(3).padStart(7)} ms │ ${dupPct.padStart(9)}%   │`);
    console.log(`  └─────────────────────┴────────────┴────────────┴──────────────┘`);

    // Cleanup
    console.log(`\n  Cleaning up ...`);
    await pool.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
    console.log("  Done!\n");

    await pool.end();
}

main().catch((err) => {
    console.error("Benchmark failed:", err);
    pool.end();
    process.exit(1);
});
