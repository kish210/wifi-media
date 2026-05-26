import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getDb } from "../db/schema";
import { authenticate, signToken } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  display_name: z.string().min(1).max(64),
  password: z.string().min(4),
  email: z.string().email().optional(),
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(parsed.data.username) as {
    id: string; username: string; display_name: string; password: string; role: string; avatar: string | null;
  } | undefined;

  if (!user || !bcrypt.compareSync(parsed.data.password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  db.prepare("UPDATE users SET last_seen = unixepoch() WHERE id = ?").run(user.id);

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  res.cookie("wifi_media_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// POST /api/auth/register
router.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(parsed.data.username);
  if (exists) return res.status(409).json({ error: "Username already taken" });

  const hash = bcrypt.hashSync(parsed.data.password, 10);
  const id = uuidv4();
  db.prepare(`
    INSERT INTO users (id, username, display_name, email, password, role)
    VALUES (?, ?, ?, ?, ?, 'viewer')
  `).run(id, parsed.data.username, parsed.data.display_name, parsed.data.email ?? null, hash);

  const token = signToken({ userId: id, username: parsed.data.username, role: "viewer" });
  res.status(201).json({ token, user: { id, username: parsed.data.username, role: "viewer" } });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("wifi_media_token");
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    "SELECT id, username, display_name, email, avatar, role, language, theme, created_at, last_seen FROM users WHERE id = ?"
  ).get(req.user!.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// PATCH /api/auth/me
router.patch("/me", authenticate, (req, res) => {
  const db = getDb();
  const { display_name, avatar, language, theme } = req.body as Record<string, string>;
  db.prepare(
    "UPDATE users SET display_name = COALESCE(?, display_name), avatar = COALESCE(?, avatar), language = COALESCE(?, language), theme = COALESCE(?, theme) WHERE id = ?"
  ).run(display_name ?? null, avatar ?? null, language ?? null, theme ?? null, req.user!.userId);
  res.json({ ok: true });
});

export default router;
