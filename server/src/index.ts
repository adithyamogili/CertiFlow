
import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174"
  ]
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "certiflow-api" });
});

// Mount all API routes
app.use("/api", routes);

app.listen(port, () => {
  console.log(`CertiFlow API listening on http://localhost:${port}`);
});
