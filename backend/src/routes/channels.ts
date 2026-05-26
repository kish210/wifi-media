import { Router } from "express";
import { getChannels, getChannelTags, getEpg, getEpgNow, getStreamUrl, getHlsStreamUrl } from "../services/tvheadend";
import { authenticate } from "../middleware/auth";
import { getDb } from "../db/schema";

const router = Router();

// GET /api/channels
router.get("/", authenticate, async (_req, res) => {
  const channels = await getChannels();
  res.json({ channels, total: channels.length });
});

// GET /api/channels/tags
router.get("/tags", authenticate, async (_req, res) => {
  const tags = await getChannelTags();
  res.json({ tags });
});

// GET /api/channels/:uuid/stream
router.get("/:uuid/stream", authenticate, (req, res) => {
  const { profile = "pass" } = req.query as { profile?: string };
  const url = profile === "hls"
    ? getHlsStreamUrl(req.params.uuid)
    : getStreamUrl(req.params.uuid);
  res.json({ url });
});

// GET /api/channels/:uuid/epg
router.get("/:uuid/epg", authenticate, async (req, res) => {
  const events = await getEpg({
    channelUuid: req.params.uuid,
    limit: parseInt((req.query.limit as string) ?? "48"),
  });
  res.json({ events });
});

// GET /api/channels/epg/now
router.get("/epg/now", authenticate, async (_req, res) => {
  const events = await getEpgNow();
  res.json({ events });
});

// GET /api/channels/favorites
router.get("/favorites", authenticate, (req, res) => {
  const db = getDb();
  const favs = db.prepare(
    "SELECT channel_id FROM channel_favorites WHERE user_id = ?"
  ).all(req.user!.userId) as { channel_id: string }[];
  res.json({ favorites: favs.map((f) => f.channel_id) });
});

// POST /api/channels/:uuid/favorite
router.post("/:uuid/favorite", authenticate, (req, res) => {
  const db = getDb();
  try {
    db.prepare(
      "INSERT OR IGNORE INTO channel_favorites (user_id, channel_id) VALUES (?, ?)"
    ).run(req.user!.userId, req.params.uuid);
    res.json({ ok: true, favorited: true });
  } catch {
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

// DELETE /api/channels/:uuid/favorite
router.delete("/:uuid/favorite", authenticate, (req, res) => {
  const db = getDb();
  db.prepare(
    "DELETE FROM channel_favorites WHERE user_id = ? AND channel_id = ?"
  ).run(req.user!.userId, req.params.uuid);
  res.json({ ok: true, favorited: false });
});

export default router;
