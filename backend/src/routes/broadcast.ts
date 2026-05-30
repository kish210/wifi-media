import { Router } from "express";
import { z } from "zod";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { io } from "../websocket";

const router = Router();

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      message     TEXT NOT NULL,
      severity    TEXT DEFAULT 'info',
      target      TEXT DEFAULT 'all',
      dismissed   INTEGER DEFAULT 0,
      sent_by     TEXT REFERENCES users(id),
      created_at  INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_broadcasts_dismissed ON broadcasts(dismissed);
    CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at);
  `);
}

let initialized = false;
function ensureInit() {
  if (!initialized) {
    initTables();
    initialized = true;
  }
}

const broadcastSchema = z.object({
  title: z.string().min(1).max(128),
  message: z.string().min(1).max(1024),
  severity: z.enum(["critical", "warning", "info", "transport"]).default("info"),
  target: z.enum(["all", "mobile", "tv"]).default("all"),
});

// GET /api/broadcast/active
router.get("/active", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const broadcasts = db.prepare(`
    SELECT b.*, u.display_name as sent_by_name
    FROM broadcasts b
    LEFT JOIN users u ON u.id = b.sent_by
    WHERE b.dismissed = 0
    ORDER BY b.created_at DESC
  `).all();
  res.json({ broadcasts });
});

// GET /api/broadcast
router.get("/", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const broadcasts = db.prepare(`
    SELECT b.*, u.display_name as sent_by_name
    FROM broadcasts b
    LEFT JOIN users u ON u.id = b.sent_by
    ORDER BY b.created_at DESC
    LIMIT 100
  `).all();
  res.json({ broadcasts });
});

// POST /api/broadcast
router.post("/", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const db = getDb();
  const id = uuidv4();
  const { title, message, severity, target } = parsed.data;

  db.prepare(`
    INSERT INTO broadcasts (id, title, message, severity, target, sent_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, message, severity, target, req.user!.userId);

  const broadcast = db.prepare(`
    SELECT b.*, u.display_name as sent_by_name
    FROM broadcasts b
    LEFT JOIN users u ON u.id = b.sent_by
    WHERE b.id = ?
  `).get(id);

  // Emit socket event to all connected clients
  if (io) {
    io.emit("broadcast:new", broadcast);
  }

  res.status(201).json(broadcast);
});

// DELETE /api/broadcast/:id
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const db = getDb();
  const existing = db.prepare("SELECT id FROM broadcasts WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Broadcast not found" });

  db.prepare("UPDATE broadcasts SET dismissed = 1 WHERE id = ?").run(req.params.id);

  if (io) {
    io.emit("broadcast:dismissed", { id: req.params.id });
  }

  res.json({ ok: true });
});

export default router;
