import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/schema";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /api/rooms
router.get("/", authenticate, (req, res) => {
  const db = getDb();
  const rooms = db.prepare(`
    SELECT r.*, u.display_name as host_name,
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
    FROM rooms r
    JOIN users u ON u.id = r.host_id
    WHERE r.ended_at IS NULL
    ORDER BY r.created_at DESC
  `).all();
  res.json({ rooms });
});

// POST /api/rooms
router.post("/", authenticate, (req, res) => {
  const db = getDb();
  const { name, media_id, media_type } = req.body as {
    name: string; media_id?: string; media_type?: string;
  };
  if (!name) return res.status(400).json({ error: "Room name required" });

  const id = uuidv4();
  db.prepare(
    "INSERT INTO rooms (id, name, host_id, media_id, media_type) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, req.user!.userId, media_id ?? null, media_type ?? null);

  db.prepare("INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)").run(id, req.user!.userId);

  res.status(201).json({ id, name });
});

// GET /api/rooms/:id
router.get("/:id", authenticate, (req, res) => {
  const db = getDb();
  const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const members = db.prepare(`
    SELECT u.id, u.display_name, u.avatar FROM room_members rm
    JOIN users u ON u.id = rm.user_id
    WHERE rm.room_id = ?
  `).all(req.params.id);

  res.json({ ...room, members });
});

// POST /api/rooms/:id/join
router.post("/:id/join", authenticate, (req, res) => {
  const db = getDb();
  const room = db.prepare("SELECT id FROM rooms WHERE id = ? AND ended_at IS NULL").get(req.params.id);
  if (!room) return res.status(404).json({ error: "Room not found or ended" });
  db.prepare("INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)").run(req.params.id, req.user!.userId);
  res.json({ ok: true });
});

// DELETE /api/rooms/:id/leave
router.delete("/:id/leave", authenticate, (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM room_members WHERE room_id = ? AND user_id = ?").run(req.params.id, req.user!.userId);
  res.json({ ok: true });
});

// GET /api/rooms/:id/messages
router.get("/:id/messages", authenticate, (req, res) => {
  const db = getDb();
  const limit = parseInt((req.query.limit as string) ?? "100");
  const messages = db.prepare(`
    SELECT cm.*, u.display_name, u.avatar FROM chat_messages cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.room_id = ?
    ORDER BY cm.sent_at ASC
    LIMIT ?
  `).all(req.params.id, limit);
  res.json({ messages });
});

// POST /api/rooms/:id/close  (host only)
router.post("/:id/close", authenticate, (req, res) => {
  const db = getDb();
  const room = db.prepare("SELECT host_id FROM rooms WHERE id = ?").get(req.params.id) as { host_id: string } | undefined;
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.host_id !== req.user!.userId && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Only host can close room" });
  }
  db.prepare("UPDATE rooms SET ended_at = unixepoch() WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
