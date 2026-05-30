import { Router } from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";
import { scanMedia } from "../services/mediaScanner";

const router = Router();

const CACHE_DIR = process.env.CACHE_DIR ?? "/data/cache";
const DATA_DIR = process.env.DATA_DIR ?? "/data";

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

function getDiskStats(): { total: number; used: number; free: number } {
  try {
    // Try df on Linux/macOS
    const output = execSync(`df -B1 "${DATA_DIR}" 2>/dev/null || df -k "${DATA_DIR}" 2>/dev/null`, {
      encoding: "utf8",
      timeout: 5000,
    });
    const lines = output.trim().split("\n");
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      // df -B1 gives bytes directly; df -k gives kilobytes
      const multiplier = output.includes("-B1") ? 1 : 1024;
      const total = parseInt(parts[1] ?? "0") * multiplier;
      const used = parseInt(parts[2] ?? "0") * multiplier;
      const free = parseInt(parts[3] ?? "0") * multiplier;
      if (total > 0) return { total, used, free };
    }
  } catch { /* fall through */ }

  // Fallback: check Node.js fs.statfsSync if available (Node 19+)
  try {
    // @ts-ignore
    if (typeof fs.statfsSync === "function") {
      // @ts-ignore
      const stats = fs.statfsSync(DATA_DIR);
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      return { total, used: total - free, free };
    }
  } catch { /* ignore */ }

  return { total: 0, used: 0, free: 0 };
}

// GET /api/storage/stats
router.get("/stats", authenticate, (req, res) => {
  const db = getDb();

  const diskStats = getDiskStats();

  // Query media by type
  const mediaByType = db.prepare(`
    SELECT type, COUNT(*) as count, COALESCE(SUM(size), 0) as size_bytes
    FROM media_cache
    GROUP BY type
  `).all() as { type: string; count: number; size_bytes: number }[];

  // Cache directory size
  const cacheStats = getDirSize(CACHE_DIR);

  // Tiles directory
  const tilesStats = getDirSize("/data/tiles");

  // Apps directory
  const appsStats = getDirSize("/data/apps");

  const breakdown = [
    ...mediaByType.map((row) => ({ type: row.type, size_bytes: row.size_bytes, count: row.count })),
    { type: "cache", size_bytes: cacheStats.size, count: cacheStats.count },
    { type: "tiles", size_bytes: tilesStats.size, count: tilesStats.count },
    { type: "apps", size_bytes: appsStats.size, count: appsStats.count },
  ];

  res.json({
    total_bytes: diskStats.total,
    used_bytes: diskStats.used,
    free_bytes: diskStats.free,
    breakdown,
  });
});

// GET /api/storage/files
router.get("/files", authenticate, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt((req.query.limit as string) ?? "50"), 200);

  const files = db.prepare(`
    SELECT id, title, type, path, size, scanned_at
    FROM media_cache
    WHERE size IS NOT NULL
    ORDER BY size DESC
    LIMIT ?
  `).all(limit) as { id: string; title: string; type: string; path: string; size: number; scanned_at: number }[];

  res.json({ files });
});

// DELETE /api/storage/cache
router.delete("/cache", authenticate, requireAdmin, (req, res) => {
  if (!fs.existsSync(CACHE_DIR)) {
    return res.json({ ok: true, removed: 0, freed_bytes: 0 });
  }

  let removed = 0;
  let freedBytes = 0;

  const deleteDirContents = (dirPath: string) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dirPath, entry.name);
        try {
          if (entry.isDirectory()) {
            deleteDirContents(full);
            fs.rmdirSync(full);
          } else {
            const stat = fs.statSync(full);
            freedBytes += stat.size;
            fs.unlinkSync(full);
            removed++;
          }
        } catch { /* skip locked files */ }
      }
    } catch { /* ignore */ }
  };

  deleteDirContents(CACHE_DIR);
  res.json({ ok: true, removed, freed_bytes: freedBytes });
});

// POST /api/storage/rescan
router.post("/rescan", authenticate, requireAdmin, async (_req, res) => {
  try {
    const result = await scanMedia();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: "Media rescan failed", detail: String(err) });
  }
});

export default router;
