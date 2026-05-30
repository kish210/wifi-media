import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

const router = Router();

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      size_bytes  INTEGER DEFAULT 0,
      progress    INTEGER DEFAULT 0,
      speed       TEXT DEFAULT '0 B/s',
      status      TEXT DEFAULT 'queued',
      path        TEXT,
      created_at  INTEGER DEFAULT (unixepoch()),
      source      TEXT DEFAULT 'kishwifi.com'
    );
    CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
  `);
}

let initialized = false;
function ensureInit() {
  if (!initialized) {
    initTables();
    initialized = true;
  }
}

const PACKAGES = [
  {
    id: "pkg-llama-3b",
    name: "Llama 3.2 3B",
    description: "Compact on-device language model for offline AI chat",
    category: "AI",
    version: "3.2",
    size_bytes: 2_000_000_000,
    url: "https://kishwifi.com/packages/llama-3.2-3b.gguf",
    source: "kishwifi.com",
  },
  {
    id: "pkg-vlc-apk",
    name: "VLC for Android APK",
    description: "Free and open source cross-platform multimedia player",
    category: "Media",
    version: "3.5.4",
    size_bytes: 25_165_824,
    url: "https://kishwifi.com/packages/vlc-android-3.5.4.apk",
    source: "kishwifi.com",
  },
  {
    id: "pkg-subtitle-fa",
    name: "Subtitle Pack FA",
    description: "Persian subtitle collection for top 500 movies",
    category: "Content",
    version: "2024.1",
    size_bytes: 524_288_000,
    url: "https://kishwifi.com/packages/subtitles-fa-2024.zip",
    source: "kishwifi.com",
  },
  {
    id: "pkg-movie-posters",
    name: "Movie Posters Pack",
    description: "High-resolution poster images for 2000+ movies",
    category: "Content",
    version: "2024.1",
    size_bytes: 1_073_741_824,
    url: "https://kishwifi.com/packages/movie-posters-2024.zip",
    source: "kishwifi.com",
  },
  {
    id: "pkg-kodi",
    name: "Kodi",
    description: "Open source home theater software",
    category: "Media",
    version: "21.0",
    size_bytes: 65_011_712,
    url: "https://kishwifi.com/packages/kodi-21.0.apk",
    source: "kishwifi.com",
  },
  {
    id: "pkg-stockfish",
    name: "Stockfish Chess Engine",
    description: "World's strongest open source chess engine",
    category: "Games",
    version: "16",
    size_bytes: 8_388_608,
    url: "https://kishwifi.com/packages/stockfish-16.apk",
    source: "kishwifi.com",
  },
];

// GET /api/downloads
router.get("/", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const { status } = req.query as Record<string, string>;
  let query = "SELECT * FROM downloads";
  const params: string[] = [];
  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }
  query += " ORDER BY created_at DESC";
  const items = db.prepare(query).all(...params);
  res.json({ items });
});

// GET /api/downloads/packages
router.get("/packages", authenticate, (_req, res) => {
  res.json({ packages: PACKAGES });
});

// POST /api/downloads
router.post("/", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const { url, name, size_bytes } = req.body as { url: string; name: string; size_bytes?: number };
  if (!url || !name) return res.status(400).json({ error: "url and name are required" });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO downloads (id, name, url, size_bytes, status)
    VALUES (?, ?, ?, ?, 'queued')
  `).run(id, name, url, size_bytes ?? 0);

  const download = db.prepare("SELECT * FROM downloads WHERE id = ?").get(id);
  res.status(201).json(download);
});

// POST /api/downloads/:id/pause
router.post("/:id/pause", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const existing = db.prepare("SELECT id, status FROM downloads WHERE id = ?").get(req.params.id) as
    | { id: string; status: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Download not found" });
  if (existing.status !== "downloading") {
    return res.status(400).json({ error: "Download is not in progress" });
  }
  db.prepare("UPDATE downloads SET status = 'queued', speed = '0 B/s' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// POST /api/downloads/:id/resume
router.post("/:id/resume", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const existing = db.prepare("SELECT id, status FROM downloads WHERE id = ?").get(req.params.id) as
    | { id: string; status: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: "Download not found" });
  if (existing.status === "completed") {
    return res.status(400).json({ error: "Download already completed" });
  }
  db.prepare("UPDATE downloads SET status = 'queued' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// DELETE /api/downloads/:id
router.delete("/:id", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const existing = db.prepare("SELECT id FROM downloads WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Download not found" });
  db.prepare("DELETE FROM downloads WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
