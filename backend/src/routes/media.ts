import { Router } from "express";
import fs from "fs";
import path from "path";
import { authenticate } from "../middleware/auth";
import { scanMedia, queryMedia, getMediaById } from "../services/mediaScanner";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET /api/media/scan  (admin trigger)
router.post("/scan", authenticate, async (_req, res) => {
  const result = await scanMedia();
  res.json(result);
});

// GET /api/media  – paginated library
router.get("/", authenticate, (req, res) => {
  const { type, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const result = queryMedia({
    type: type || undefined,
    search: search || undefined,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json(result);
});

// GET /api/media/:id
router.get("/:id", authenticate, (req, res) => {
  const item = getMediaById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

// GET /api/media/stream/:id  – video streaming with range support
router.get("/stream/:id", authenticate, (req, res) => {
  const item = getMediaById(req.params.id);
  if (!item || !fs.existsSync(item.path)) {
    return res.status(404).json({ error: "File not found" });
  }

  const stat = fs.statSync(item.path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": getMimeType(item.path),
    });
    fs.createReadStream(item.path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": getMimeType(item.path),
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(item.path).pipe(res);
  }
});

// GET /api/media/image  – serve local poster/thumbnail
router.get("/image", authenticate, (req, res) => {
  const imgPath = decodeURIComponent((req.query.path as string) ?? "");
  if (!imgPath || !fs.existsSync(imgPath)) {
    return res.status(404).end();
  }
  const ext = path.extname(imgPath).slice(1).toLowerCase();
  res.setHeader("Content-Type", `image/${ext === "jpg" ? "jpeg" : ext}`);
  res.setHeader("Cache-Control", "public, max-age=86400");
  fs.createReadStream(imgPath).pipe(res);
});

// POST /api/media/:id/progress  – save watch progress
router.post("/:id/progress", authenticate, (req, res) => {
  const db = getDb();
  const { progress, duration } = req.body as { progress: number; duration: number };
  const existing = db.prepare(
    "SELECT id FROM watch_history WHERE user_id = ? AND media_id = ?"
  ).get(req.user!.userId, req.params.id);

  const item = getMediaById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });

  if (existing) {
    db.prepare(
      "UPDATE watch_history SET progress = ?, duration = ?, watched_at = unixepoch() WHERE user_id = ? AND media_id = ?"
    ).run(progress, duration, req.user!.userId, req.params.id);
  } else {
    db.prepare(
      "INSERT INTO watch_history (id, user_id, media_id, media_type, progress, duration) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(uuidv4(), req.user!.userId, req.params.id, item.type, progress, duration);
  }
  res.json({ ok: true });
});

// GET /api/media/history/recent
router.get("/history/recent", authenticate, (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT wh.*, mc.title, mc.poster, mc.type as media_type_label
    FROM watch_history wh
    JOIN media_cache mc ON mc.id = wh.media_id
    WHERE wh.user_id = ?
    ORDER BY wh.watched_at DESC
    LIMIT 20
  `).all(req.user!.userId);
  res.json({ items });
});

// POST /api/media/:id/watchlist
router.post("/:id/watchlist", authenticate, (req, res) => {
  const db = getDb();
  const item = getMediaById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  try {
    db.prepare(
      "INSERT OR IGNORE INTO watchlist (id, user_id, media_id, media_type) VALUES (?, ?, ?, ?)"
    ).run(uuidv4(), req.user!.userId, req.params.id, item.type);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/media/watchlist/all
router.get("/watchlist/all", authenticate, (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT w.*, mc.title, mc.poster, mc.year
    FROM watchlist w
    JOIN media_cache mc ON mc.id = w.media_id
    WHERE w.user_id = ?
    ORDER BY w.added_at DESC
  `).all(req.user!.userId);
  res.json({ items });
});

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".ts": "video/mp2t",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
  };
  return map[ext] ?? "application/octet-stream";
}

export default router;
