import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "./config";
import { getDb } from "./db/schema";
import { setupWebSocket } from "./websocket";
import authRouter from "./routes/auth";
import channelsRouter from "./routes/channels";
import mediaRouter from "./routes/media";
import roomsRouter from "./routes/rooms";
import networkRouter from "./routes/network";
import adminRouter from "./routes/admin";
import { scanMedia } from "./services/mediaScanner";

const app = express();
const server = http.createServer(app);

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/channels", channelsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/admin", adminRouter);
app.use("/api", networkRouter);

// ── WebSocket ──────────────────────────────────────────────────────────────
setupWebSocket(server);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(config.port, "0.0.0.0", async () => {
  console.log(`\n🎬  WiFi-Media backend  →  http://0.0.0.0:${config.port}`);
  getDb(); // init DB + seed
  const { added, total } = await scanMedia();
  console.log(`📂  Media library: ${total} files (${added} new)`);
});

export default app;
