import express from "express";
import http from "http";
import cors from "cors";
import booksRouter from "./routes/books.js";
import authRouter from "./routes/auth.js";
import friendsRouter from "./routes/friends.js";
import recommendationsRouter from "./routes/recommendations.js";
import { initSocket } from "./socket.js";
import "dotenv/config";

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

app.use(cors());
app.use(express.json());

// Make io accessible to routes via req.app
app.set("io", io);

app.use("/auth", authRouter);
app.use("/books", booksRouter);
app.use("/friends", friendsRouter);
app.use("/recommendations", recommendationsRouter);

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
