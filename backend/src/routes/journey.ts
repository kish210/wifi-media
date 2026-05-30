import { Router } from "express";
import { z } from "zod";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";

const router = Router();

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS journey_config (
      id                INTEGER PRIMARY KEY DEFAULT 1,
      origin            TEXT DEFAULT 'Tehran',
      destination       TEXT DEFAULT 'Shiraz',
      stops             TEXT DEFAULT '[]',
      vehicle_type      TEXT DEFAULT 'train',
      current_speed     INTEGER DEFAULT 0,
      current_altitude  INTEGER DEFAULT 0,
      lat               REAL DEFAULT 35.689,
      lon               REAL DEFAULT 51.389,
      progress_pct      INTEGER DEFAULT 0,
      eta_minutes       INTEGER DEFAULT 0,
      updated_at        INTEGER DEFAULT (unixepoch())
    );
  `);

  // Seed default Tehran→Shiraz route
  const existing = db.prepare("SELECT id FROM journey_config WHERE id = 1").get();
  if (!existing) {
    db.prepare(`
      INSERT INTO journey_config
        (id, origin, destination, stops, vehicle_type, current_speed, current_altitude, lat, lon, progress_pct, eta_minutes)
      VALUES
        (1, 'Tehran', 'Shiraz',
         '["Qom","Isfahan","Persepolis"]',
         'train', 0, 1200, 35.689, 51.389, 0, 480)
    `).run();
  }
}

let initialized = false;
function ensureInit() {
  if (!initialized) {
    initTables();
    initialized = true;
  }
}

const updateSchema = z.object({
  origin: z.string().min(1).max(128).optional(),
  destination: z.string().min(1).max(128).optional(),
  stops: z.array(z.string()).optional(),
  vehicle_type: z.enum(["train", "bus", "ship", "plane"]).optional(),
  current_speed: z.number().int().min(0).max(2000).optional(),
  current_altitude: z.number().int().min(-500).max(15000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  progress_pct: z.number().int().min(0).max(100).optional(),
  eta_minutes: z.number().int().min(0).optional(),
});

const WEATHER_MOCK: Record<string, { temp: number; description: string; humidity: number; wind: number; icon: string }> = {
  tehran:     { temp: 22, description: "Partly cloudy", humidity: 45, wind: 12, icon: "partly-cloudy" },
  shiraz:     { temp: 28, description: "Sunny",         humidity: 30, wind: 8,  icon: "sunny" },
  isfahan:    { temp: 25, description: "Clear",          humidity: 35, wind: 10, icon: "clear" },
  qom:        { temp: 30, description: "Hot and dry",   humidity: 20, wind: 15, icon: "sunny" },
  mashhad:    { temp: 18, description: "Overcast",       humidity: 60, wind: 20, icon: "cloudy" },
  tabriz:     { temp: 14, description: "Light rain",    humidity: 75, wind: 18, icon: "rainy" },
  ahvaz:      { temp: 38, description: "Very hot",      humidity: 55, wind: 5,  icon: "hot" },
  bandarabbas:{ temp: 35, description: "Humid and warm",humidity: 80, wind: 12, icon: "humid" },
  kish:       { temp: 32, description: "Sunny and warm",humidity: 70, wind: 14, icon: "sunny" },
  persepolis: { temp: 26, description: "Sunny",         humidity: 28, wind: 6,  icon: "sunny" },
};

// GET /api/journey
router.get("/", authenticate, (_req, res) => {
  ensureInit();
  const db = getDb();
  const config = db.prepare("SELECT * FROM journey_config WHERE id = 1").get() as Record<string, unknown> | undefined;
  if (!config) return res.status(404).json({ error: "Journey config not found" });

  let stops: string[] = [];
  try { stops = JSON.parse(config.stops as string); } catch { /* ignore */ }

  res.json({
    origin: config.origin,
    destination: config.destination,
    stops,
    vehicle_type: config.vehicle_type,
    current_speed: config.current_speed,
    current_altitude: config.current_altitude,
    current_position: { lat: config.lat, lon: config.lon },
    progress_pct: config.progress_pct,
    eta_minutes: config.eta_minutes,
    updated_at: config.updated_at,
  });
});

// PUT /api/journey
router.put("/", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const db = getDb();
  const data = parsed.data;
  const stopsJson = data.stops !== undefined ? JSON.stringify(data.stops) : undefined;

  db.prepare(`
    UPDATE journey_config SET
      origin           = COALESCE(?, origin),
      destination      = COALESCE(?, destination),
      stops            = COALESCE(?, stops),
      vehicle_type     = COALESCE(?, vehicle_type),
      current_speed    = COALESCE(?, current_speed),
      current_altitude = COALESCE(?, current_altitude),
      lat              = COALESCE(?, lat),
      lon              = COALESCE(?, lon),
      progress_pct     = COALESCE(?, progress_pct),
      eta_minutes      = COALESCE(?, eta_minutes),
      updated_at       = unixepoch()
    WHERE id = 1
  `).run(
    data.origin ?? null,
    data.destination ?? null,
    stopsJson ?? null,
    data.vehicle_type ?? null,
    data.current_speed ?? null,
    data.current_altitude ?? null,
    data.lat ?? null,
    data.lon ?? null,
    data.progress_pct ?? null,
    data.eta_minutes ?? null,
  );

  const config = db.prepare("SELECT * FROM journey_config WHERE id = 1").get() as Record<string, unknown>;
  let stops: string[] = [];
  try { stops = JSON.parse(config.stops as string); } catch { /* ignore */ }

  res.json({
    origin: config.origin,
    destination: config.destination,
    stops,
    vehicle_type: config.vehicle_type,
    current_speed: config.current_speed,
    current_altitude: config.current_altitude,
    current_position: { lat: config.lat, lon: config.lon },
    progress_pct: config.progress_pct,
    eta_minutes: config.eta_minutes,
    updated_at: config.updated_at,
  });
});

// GET /api/journey/weather/:city
router.get("/weather/:city", authenticate, (req, res) => {
  const city = req.params.city.toLowerCase().trim();
  const weather = WEATHER_MOCK[city];

  if (weather) {
    return res.json({ city: req.params.city, ...weather });
  }

  // Return generic weather for unknown cities
  res.json({
    city: req.params.city,
    temp: 20 + Math.floor(Math.random() * 15),
    description: "Partly cloudy",
    humidity: 40 + Math.floor(Math.random() * 30),
    wind: 5 + Math.floor(Math.random() * 20),
    icon: "partly-cloudy",
  });
});

export default router;
