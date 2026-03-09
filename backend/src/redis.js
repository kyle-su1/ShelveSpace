import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({ url: REDIS_URL });

// Graceful error handling — app continues working if Redis is down
redisClient.on("error", (err) => {
    console.warn("⚠️  Redis connection error (caching disabled):", err.message);
});

// Connect (non-blocking — failures are caught by the error handler)
redisClient.connect().catch((err) => {
    console.warn("⚠️  Could not connect to Redis:", err.message);
});

export default redisClient;
