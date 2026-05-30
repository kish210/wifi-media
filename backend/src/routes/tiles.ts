import { Router } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const TILES_DIR = process.env.TILES_DIR ?? "/data/tiles";
const OSM_URL = "https://tile.openstreetmap.org";
const TILE_CACHE_MAX_AGE = 604800; // 7 days in seconds

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS map_regions (
      id          TEXT PRIMARY KEY,
      name        TEXT UNIQUE NOT NULL,
      bbox        TEXT NOT NULL,
      min_zoom    INTEGER NOT NULL DEFAULT 0,
      max_zoom    INTEGER NOT NULL DEFAULT 16,
      tile_count  INTEGER DEFAULT 0,
      size_bytes  INTEGER DEFAULT 0,
      status      TEXT DEFAULT 'pending',
      created_at  INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_map_regions_name ON map_regions(name);
    CREATE INDEX IF NOT EXISTS idx_map_regions_status ON map_regions(status);
  `);
}

let initialized = false;
function ensureInit() {
  if (!initialized) {
    initTables();
    initialized = true;
  }
}

function getTilePath(z: number, x: number, y: number): string {
  return path.join(TILES_DIR, String(z), String(x), `${y}.png`);
}

function ensureTileDir(z: number, x: number) {
  const dir = path.join(TILES_DIR, String(z), String(x));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function calcTileCount(bbox: { north: number; south: number; east: number; west: number }, minZoom: number, maxZoom: number): number {
  let count = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    const xMin = Math.floor(((bbox.west + 180) / 360) * n);
    const xMax = Math.floor(((bbox.east + 180) / 360) * n);
    const latMinRad = (bbox.south * Math.PI) / 180;
    const latMaxRad = (bbox.north * Math.PI) / 180;
    const yMin = Math.floor(((1 - Math.log(Math.tan(latMaxRad) + 1 / Math.cos(latMaxRad)) / Math.PI) / 2) * n);
    const yMax = Math.floor(((1 - Math.log(Math.tan(latMinRad) + 1 / Math.cos(latMinRad)) / Math.PI) / 2) * n);
    count += (xMax - xMin + 1) * (yMax - yMin + 1);
  }
  return count;
}

function getDirSize(dirPath: string): { size: number; count: number } {
  let totalSize = 0;
  let count = 0;
  if (!fs.existsSync(dirPath)) return { size: 0, count: 0 };

  const walk = (current: string) => {
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          try {
            totalSize += fs.statSync(full).size;
            count++;
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  };
  walk(dirPath);
  return { size: totalSize, count };
}

// GET /api/tiles/:z/:x/:y.png
router.get("/:z/:x/:y.png", async (req, res) => {
  const z = parseInt(req.params.z);
  const x = parseInt(req.params.x);
  const y = parseInt(req.params.y);

  if (isNaN(z) || isNaN(x) || isNaN(y) || z < 0 || z > 20 || x < 0 || y < 0) {
    return res.status(400).json({ error: "Invalid tile coordinates" });
  }

  const tilePath = getTilePath(z, x, y);

  // Serve from cache if available
  if (fs.existsSync(tilePath)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", `public, max-age=${TILE_CACHE_MAX_AGE}`);
    res.setHeader("X-Tile-Source", "cache");
    return fs.createReadStream(tilePath).pipe(res);
  }

  // Proxy from OSM and cache
  try {
    const fetch = (await import("node-fetch")).default;
    const osmRes = await fetch(`${OSM_URL}/${z}/${x}/${y}.png`, {
      headers: {
        "User-Agent": "WiFi-Media/1.0 (Offline Map; contact@kishwifi.com)",
        "Accept": "image/png",
      },
    });

    if (!osmRes.ok) {
      return res.status(osmRes.status).json({ error: "Tile not available from upstream" });
    }

    const buffer = await osmRes.buffer();

    // Cache the tile
    try {
      ensureTileDir(z, x);
      fs.writeFileSync(tilePath, buffer);
    } catch { /* ignore cache write errors */ }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", `public, max-age=${TILE_CACHE_MAX_AGE}`);
    res.setHeader("X-Tile-Source", "upstream");
    res.send(buffer);
  } catch {
    res.status(503).json({ error: "Tile proxy failed — OSM unreachable and tile not cached" });
  }
});

// GET /api/tiles/regions
router.get("/regions", authenticate, (_req, res) => {
  ensureInit();
  const db = getDb();
  const regions = db.prepare("SELECT * FROM map_regions ORDER BY created_at DESC").all();
  res.json({ regions });
});

// GET /api/tiles/stats
router.get("/stats", authenticate, (_req, res) => {
  ensureInit();
  const db = getDb();

  const { size, count } = getDirSize(TILES_DIR);

  const regionCount = (db.prepare("SELECT COUNT(*) as c FROM map_regions").get() as { c: number }).c;
  const completedRegions = (db.prepare("SELECT COUNT(*) as c FROM map_regions WHERE status = 'completed'").get() as { c: number }).c;

  res.json({
    tile_count: count,
    size_bytes: size,
    region_count: regionCount,
    completed_regions: completedRegions,
    tiles_dir: TILES_DIR,
  });
});

const downloadSchema = z.object({
  name: z.string().min(1).max(128),
  bbox: z.object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  }),
  min_zoom: z.number().int().min(0).max(18).default(5),
  max_zoom: z.number().int().min(0).max(18).default(14),
});

// POST /api/tiles/download
router.post("/download", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const parsed = downloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const { name, bbox, min_zoom, max_zoom } = parsed.data;

  if (min_zoom > max_zoom) {
    return res.status(400).json({ error: "min_zoom must be <= max_zoom" });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM map_regions WHERE name = ?").get(name);
  if (existing) return res.status(409).json({ error: "Region with this name already exists" });

  const estimatedTiles = calcTileCount(bbox, min_zoom, max_zoom);
  if (estimatedTiles > 100_000) {
    return res.status(400).json({
      error: "Bounding box too large",
      estimated_tiles: estimatedTiles,
      hint: "Reduce zoom levels or use a smaller bounding box (max 100,000 tiles)",
    });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO map_regions (id, name, bbox, min_zoom, max_zoom, tile_count, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, name, JSON.stringify(bbox), min_zoom, max_zoom, estimatedTiles);

  // Kick off background download
  setImmediate(async () => {
    const fetch = (await import("node-fetch")).default;
    let downloaded = 0;
    let totalSize = 0;

    try {
      const dbInner = getDb();
      dbInner.prepare("UPDATE map_regions SET status = 'downloading' WHERE id = ?").run(id);

      for (let z = min_zoom; z <= max_zoom; z++) {
        const n = Math.pow(2, z);
        const xMin = Math.floor(((bbox.west + 180) / 360) * n);
        const xMax = Math.floor(((bbox.east + 180) / 360) * n);
        const latMinRad = (bbox.south * Math.PI) / 180;
        const latMaxRad = (bbox.north * Math.PI) / 180;
        const yMin = Math.floor(((1 - Math.log(Math.tan(latMaxRad) + 1 / Math.cos(latMaxRad)) / Math.PI) / 2) * n);
        const yMax = Math.floor(((1 - Math.log(Math.tan(latMinRad) + 1 / Math.cos(latMinRad)) / Math.PI) / 2) * n);

        for (let x = xMin; x <= xMax; x++) {
          for (let y = yMin; y <= yMax; y++) {
            const tilePath = getTilePath(z, x, y);
            if (!fs.existsSync(tilePath)) {
              try {
                const tileRes = await fetch(`${OSM_URL}/${z}/${x}/${y}.png`, {
                  headers: { "User-Agent": "WiFi-Media/1.0 (Offline Map; contact@kishwifi.com)" },
                });
                if (tileRes.ok) {
                  const buffer = await tileRes.buffer();
                  ensureTileDir(z, x);
                  fs.writeFileSync(tilePath, buffer);
                  totalSize += buffer.length;
                }
                // Rate limit: 1 req/100ms to be polite to OSM
                await new Promise((r) => setTimeout(r, 100));
              } catch { /* skip failed tiles */ }
            } else {
              try { totalSize += fs.statSync(tilePath).size; } catch { /* ignore */ }
            }
            downloaded++;
          }
        }
      }

      dbInner.prepare(`
        UPDATE map_regions SET status = 'completed', tile_count = ?, size_bytes = ? WHERE id = ?
      `).run(downloaded, totalSize, id);
    } catch {
      const dbInner = getDb();
      dbInner.prepare("UPDATE map_regions SET status = 'failed' WHERE id = ?").run(id);
    }
  });

  res.status(202).json({
    id,
    name,
    bbox,
    min_zoom,
    max_zoom,
    estimated_tiles: estimatedTiles,
    status: "pending",
    message: "Download started in background",
  });
});

// DELETE /api/tiles/region/:name
router.delete("/region/:name", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const db = getDb();
  const region = db.prepare("SELECT * FROM map_regions WHERE name = ?").get(req.params.name) as
    | { id: string; name: string; bbox: string; min_zoom: number; max_zoom: number }
    | undefined;

  if (!region) return res.status(404).json({ error: "Region not found" });

  let bbox: { north: number; south: number; east: number; west: number };
  try {
    bbox = JSON.parse(region.bbox);
  } catch {
    db.prepare("DELETE FROM map_regions WHERE name = ?").run(req.params.name);
    return res.json({ ok: true, removed: 0 });
  }

  let removed = 0;
  for (let z = region.min_zoom; z <= region.max_zoom; z++) {
    const n = Math.pow(2, z);
    const xMin = Math.floor(((bbox.west + 180) / 360) * n);
    const xMax = Math.floor(((bbox.east + 180) / 360) * n);
    const latMinRad = (bbox.south * Math.PI) / 180;
    const latMaxRad = (bbox.north * Math.PI) / 180;
    const yMin = Math.floor(((1 - Math.log(Math.tan(latMaxRad) + 1 / Math.cos(latMaxRad)) / Math.PI) / 2) * n);
    const yMax = Math.floor(((1 - Math.log(Math.tan(latMinRad) + 1 / Math.cos(latMinRad)) / Math.PI) / 2) * n);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const tilePath = getTilePath(z, x, y);
        if (fs.existsSync(tilePath)) {
          try {
            fs.unlinkSync(tilePath);
            removed++;
          } catch { /* ignore */ }
        }
      }
    }
  }

  db.prepare("DELETE FROM map_regions WHERE name = ?").run(req.params.name);
  res.json({ ok: true, removed });
});

export default router;
