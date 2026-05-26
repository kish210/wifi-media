import fs from "fs";
import path from "path";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";

const VIDEO_EXT = new Set([".mp4", ".mkv", ".avi", ".mov", ".ts", ".m2ts", ".webm"]);
const AUDIO_EXT = new Set([".mp3", ".flac", ".aac", ".ogg", ".wav", ".m4a"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export interface MediaItem {
  id: string;
  path: string;
  type: "movie" | "series" | "music" | "video";
  title: string;
  year: number | null;
  description: string | null;
  poster: string | null;
  backdrop: string | null;
  duration: number | null;
  size: number;
  genres: string[];
  rating: number | null;
  scanned_at: number;
}

function guessType(filePath: string): "movie" | "series" | "music" | "video" {
  const parts = filePath.split(path.sep);
  const lower = filePath.toLowerCase();
  if (AUDIO_EXT.has(path.extname(lower))) return "music";
  if (lower.includes("series") || lower.includes("shows") || /s\d+e\d+/i.test(lower)) return "series";
  if (lower.includes("movies") || lower.includes("films")) return "movie";
  return "video";
}

function parseTitleFromFilename(filename: string): { title: string; year: number | null } {
  const name = path.basename(filename, path.extname(filename));
  const yearMatch = name.match(/[(\[](19|20)\d{2}[)\]]/);
  const year = yearMatch ? parseInt(yearMatch[0].replace(/[^\d]/g, "")) : null;
  const title = name
    .replace(/[(\[](19|20)\d{2}[)\]]/g, "")
    .replace(/\b(1080p|720p|480p|4k|BluRay|WEB-DL|HDRip|x264|x265|HEVC|AAC|AC3)\b/gi, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title: title || name, year };
}

function findPoster(dir: string, baseName: string): string | null {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const candidates = [
      path.join(dir, `${baseName}${ext}`),
      path.join(dir, `poster${ext}`),
      path.join(dir, `folder${ext}`),
      path.join(dir, `cover${ext}`),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return `/api/media/image?path=${encodeURIComponent(c)}`;
    }
  }
  return null;
}

export async function scanMedia(): Promise<{ added: number; total: number }> {
  const db = getDb();
  const mediaPath = config.media.path;

  if (!fs.existsSync(mediaPath)) {
    fs.mkdirSync(mediaPath, { recursive: true });
    return { added: 0, total: 0 };
  }

  let added = 0;
  const queue = [mediaPath];
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO media_cache
      (id, path, type, title, year, poster, duration, size, genres, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
  `);

  const insertMany = db.transaction((files: string[]) => {
    for (const filePath of files) {
      const existing = db.prepare("SELECT id FROM media_cache WHERE path = ?").get(filePath);
      if (existing) continue;

      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const dir = path.dirname(filePath);
      const { title, year } = parseTitleFromFilename(filePath);
      const type = guessType(filePath);
      const poster = findPoster(dir, path.basename(filePath, ext));

      upsert.run(
        uuidv4(), filePath, type, title, year,
        poster, null, stat.size, JSON.stringify([]),
      );
      added++;
    }
  });

  const videoFiles: string[] = [];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          queue.push(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXT.has(ext) || AUDIO_EXT.has(ext)) {
            videoFiles.push(fullPath);
          }
        }
      }
    } catch { /* skip permission errors */ }
  }

  insertMany(videoFiles);
  const total = (db.prepare("SELECT COUNT(*) as c FROM media_cache").get() as { c: number }).c;
  return { added, total };
}

export function getMediaById(id: string): MediaItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM media_cache WHERE id = ?").get(id) as MediaItem | undefined;
  if (!row) return null;
  return { ...row, genres: JSON.parse((row.genres as unknown as string) ?? "[]") };
}

export function queryMedia(opts: {
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { items: MediaItem[]; total: number } {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.type) { where.push("type = ?"); params.push(opts.type); }
  if (opts.search) {
    where.push("title LIKE ?");
    params.push(`%${opts.search}%`);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) as c FROM media_cache ${clause}`).get(...params) as { c: number }).c;
  const items = db.prepare(
    `SELECT * FROM media_cache ${clause} ORDER BY title LIMIT ? OFFSET ?`
  ).all(...params, opts.limit ?? 50, opts.offset ?? 0) as MediaItem[];

  return {
    items: items.map((m) => ({ ...m, genres: JSON.parse((m.genres as unknown as string) ?? "[]") })),
    total,
  };
}
