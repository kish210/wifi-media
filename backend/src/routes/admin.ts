import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";
import { scanMedia } from "../services/mediaScanner";
import bcrypt from "bcryptjs";

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/users
router.get("/users", (req, res) => {
  const db = getDb();
  const users = db.prepare(
    "SELECT id, username, display_name, email, role, avatar, created_at, last_seen FROM users ORDER BY created_at DESC"
  ).all();
  res.json({ users });
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", (req, res) => {
  const db = getDb();
  const { role, display_name, password } = req.body as {
    role?: string; display_name?: string; password?: string;
  };
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, req.params.id);
  }
  if (role || display_name) {
    db.prepare(
      "UPDATE users SET role = COALESCE(?, role), display_name = COALESCE(?, display_name) WHERE id = ?"
    ).run(role ?? null, display_name ?? null, req.params.id);
  }
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", (req, res) => {
  const db = getDb();
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ error: "Cannot delete yourself" });
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// POST /api/admin/media/scan
router.post("/media/scan", async (_req, res) => {
  const result = await scanMedia();
  res.json(result);
});

// GET /api/admin/stats
router.get("/stats", (req, res) => {
  const db = getDb();
  const users = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  const media = (db.prepare("SELECT COUNT(*) as c FROM media_cache").get() as { c: number }).c;
  const rooms = (db.prepare("SELECT COUNT(*) as c FROM rooms WHERE ended_at IS NULL").get() as { c: number }).c;
  const messages = (db.prepare("SELECT COUNT(*) as c FROM chat_messages").get() as { c: number }).c;
  const byType = db.prepare("SELECT type, COUNT(*) as c FROM media_cache GROUP BY type").all();

  res.json({ users, media, rooms, messages, byType });
});

// DELETE /api/admin/media/:id
router.delete("/media/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM media_cache WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
