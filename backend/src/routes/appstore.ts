import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const APPS_DIR = "/data/apps";

function ensureAppsDir() {
  if (!fs.existsSync(APPS_DIR)) fs.mkdirSync(APPS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureAppsDir();
    cb(null, APPS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/vnd.android.package-archive" || path.extname(file.originalname).toLowerCase() === ".apk") {
      cb(null, true);
    } else {
      cb(new Error("Only APK files are allowed"));
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
});

const SEED_APPS = [
  { name: "VLC for Android", description: "Free and open source cross-platform multimedia player", category: "App", version: "3.5.4", size_bytes: 25_165_824, icon: "vlc" },
  { name: "Kodi", description: "Open source home theater/media center software", category: "App", version: "21.0", size_bytes: 65_011_712, icon: "kodi" },
  { name: "Termux", description: "Android terminal emulator and Linux environment app", category: "Tool", version: "0.118.1", size_bytes: 18_874_368, icon: "termux" },
  { name: "Stockfish Chess", description: "World's strongest open source chess engine for Android", category: "Game", version: "16", size_bytes: 8_388_608, icon: "stockfish" },
  { name: "Jellyfin Mobile", description: "Jellyfin mobile client for Android", category: "App", version: "2.6.2", size_bytes: 18_874_368, icon: "jellyfin" },
  { name: "Network Analyzer", description: "Advanced network scanner and IP tools", category: "Tool", version: "7.5", size_bytes: 6_291_456, icon: "network-analyzer" },
  { name: "QuickPic", description: "Fast and lightweight gallery app", category: "App", version: "4.0", size_bytes: 12_582_912, icon: "quickpic" },
  { name: "Pong LAN", description: "Classic Pong game playable over local WiFi network", category: "Game", version: "1.2", size_bytes: 4_194_304, icon: "pong-lan" },
];

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      description   TEXT,
      category      TEXT NOT NULL,
      version       TEXT,
      size_bytes    INTEGER DEFAULT 0,
      icon          TEXT,
      apk_path      TEXT,
      status        TEXT DEFAULT 'available',
      installed_at  INTEGER,
      created_at    INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM apps").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO apps (id, name, description, category, version, size_bytes, icon, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'available')
    `);
    const insertMany = db.transaction(() => {
      for (const app of SEED_APPS) {
        insert.run(uuidv4(), app.name, app.description, app.category, app.version, app.size_bytes, app.icon);
      }
    });
    insertMany();
  }
}

let initialized = false;
function ensureInit() {
  if (!initialized) {
    initTables();
    initialized = true;
  }
}

// GET /api/appstore
router.get("/", (req, res) => {
  ensureInit();
  const db = getDb();
  const { cat, search } = req.query as Record<string, string>;

  let query = "SELECT * FROM apps WHERE 1=1";
  const params: string[] = [];

  if (cat) {
    query += " AND LOWER(category) = LOWER(?)";
    params.push(cat);
  }
  if (search) {
    query += " AND (LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))";
    params.push(`%${search}%`, `%${search}%`);
  }
  query += " ORDER BY name ASC";

  const apps = db.prepare(query).all(...params);
  res.json({ apps });
});

// GET /api/appstore/:id
router.get("/:id", (req, res) => {
  ensureInit();
  const db = getDb();
  const app = db.prepare("SELECT * FROM apps WHERE id = ?").get(req.params.id);
  if (!app) return res.status(404).json({ error: "App not found" });
  res.json(app);
});

// POST /api/appstore/install/:id
router.post("/install/:id", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const app = db.prepare("SELECT * FROM apps WHERE id = ?").get(req.params.id) as
    | { id: string; status: string }
    | undefined;
  if (!app) return res.status(404).json({ error: "App not found" });
  if (app.status === "installed") return res.status(400).json({ error: "App already installed" });

  db.prepare("UPDATE apps SET status = 'installing' WHERE id = ?").run(req.params.id);

  // Simulate async install completion
  setTimeout(() => {
    try {
      const dbInner = getDb();
      dbInner.prepare("UPDATE apps SET status = 'installed', installed_at = unixepoch() WHERE id = ?").run(req.params.id);
    } catch { /* ignore */ }
  }, 2000);

  res.json({ ok: true, status: "installing" });
});

// POST /api/appstore/upload
router.post("/upload", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  ensureAppsDir();
  upload.single("apk")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const db = getDb();
    const { name, description, category, version } = req.body as Record<string, string>;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO apps (id, name, description, category, version, size_bytes, apk_path, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'available')
    `).run(id, name, description ?? "", category, version ?? "1.0", req.file.size, req.file.path);

    const app = db.prepare("SELECT * FROM apps WHERE id = ?").get(id);
    res.status(201).json(app);
  });
});

// DELETE /api/appstore/:id
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const db = getDb();
  const app = db.prepare("SELECT * FROM apps WHERE id = ?").get(req.params.id) as
    | { id: string; apk_path: string | null }
    | undefined;
  if (!app) return res.status(404).json({ error: "App not found" });

  if (app.apk_path && fs.existsSync(app.apk_path)) {
    try { fs.unlinkSync(app.apk_path); } catch { /* ignore */ }
  }
  db.prepare("UPDATE apps SET status = 'available', installed_at = NULL WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
