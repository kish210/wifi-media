import { Router } from "express";
import os from "os";
import { getServerStatus } from "../services/tvheadend";
import { getDb } from "../db/schema";
import { config } from "../config";

const router = Router();

// GET /api/network/status  – public, no auth needed
router.get("/status", async (_req, res) => {
  const tvh = await getServerStatus();
  const db = getDb();
  const users = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  const media = (db.prepare("SELECT COUNT(*) as c FROM media_cache").get() as { c: number }).c;

  const interfaces: Record<string, string[]> = {};
  const nets = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    interfaces[name] = addrs
      .filter((a) => !a.internal)
      .map((a) => `${a.address} (${a.family})`);
  }

  res.json({
    app: config.app.name,
    version: "1.0.0",
    uptime: Math.floor(process.uptime()),
    tvheadend: tvh,
    stats: { users, media },
    network: interfaces,
    timestamp: Date.now(),
  });
});

// GET /api/health  – minimal liveness probe
router.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

export default router;
