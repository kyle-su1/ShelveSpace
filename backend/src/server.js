import express from "express";
import cors from "cors";
import booksRouter from "./routes/books.js";
import authRouter from "./routes/auth.js";
import "dotenv/config";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/books", booksRouter);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
