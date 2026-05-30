import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getDb } from "../db/schema";

const router = Router();

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434";

// All AI routes require authentication
router.use(authenticate);

async function fetchOllama(path: string, options?: RequestInit): Promise<Response> {
  const fetch = (await import("node-fetch")).default;
  return fetch(`${OLLAMA_URL}${path}`, options as Parameters<typeof fetch>[1]) as unknown as Response;
}

// GET /api/ai/status
router.get("/status", async (_req, res) => {
  try {
    const response = await fetchOllama("/api/tags");
    if (!response.ok) {
      return res.json({ running: false, models: [] });
    }
    const data = (await response.json()) as { models?: { name: string }[] };
    const models = (data.models ?? []).map((m: { name: string }) => m.name);
    res.json({ running: true, models });
  } catch {
    res.json({ running: false, models: [] });
  }
});

// GET /api/ai/models
router.get("/models", async (_req, res) => {
  try {
    const response = await fetchOllama("/api/tags");
    if (!response.ok) {
      return res.status(503).json({ error: "Ollama is not available" });
    }
    const data = (await response.json()) as { models?: unknown[] };
    res.json({ models: data.models ?? [] });
  } catch {
    res.status(503).json({ error: "Ollama is not reachable" });
  }
});

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  const { model, messages, stream = true } = req.body as {
    model: string;
    messages: { role: string; content: string }[];
    stream?: boolean;
  };

  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: "model and messages are required" });
  }

  try {
    const fetch = (await import("node-fetch")).default;
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream }),
    });

    if (!ollamaRes.ok) {
      return res.status(ollamaRes.status).json({ error: "Ollama request failed" });
    }

    if (stream) {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("X-Accel-Buffering", "no");
      (ollamaRes.body as NodeJS.ReadableStream).pipe(res);
    } else {
      const data = await ollamaRes.json();
      res.json(data);
    }
  } catch {
    res.status(503).json({ error: "Ollama is not reachable" });
  }
});

// POST /api/ai/recommend
router.post("/recommend", async (req, res) => {
  const db = getDb();
  const userId = req.user!.userId;

  const history = db.prepare(`
    SELECT mc.title, mc.type, mc.genres, mc.year
    FROM watch_history wh
    JOIN media_cache mc ON mc.id = wh.media_id
    WHERE wh.user_id = ?
    ORDER BY wh.watched_at DESC
    LIMIT 20
  `).all(userId) as { title: string; type: string; genres: string | null; year: number | null }[];

  if (history.length === 0) {
    return res.json({
      recommendations: [],
      message: "No watch history found. Start watching to get personalized recommendations.",
    });
  }

  const historyText = history
    .map((h) => `${h.title} (${h.type}, ${h.year ?? "N/A"})`)
    .join(", ");

  const prompt = `Based on this watch history: ${historyText}. Suggest 5 similar movies or shows the user would enjoy. Return as JSON array with fields: title, year, reason.`;

  try {
    const fetch = (await import("node-fetch")).default;
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: (req.body as { model?: string }).model ?? "llama3.2",
        prompt,
        stream: false,
        format: "json",
      }),
    });

    if (!ollamaRes.ok) {
      return res.status(503).json({ error: "AI recommendation service unavailable" });
    }

    const data = (await ollamaRes.json()) as { response?: string };
    let recommendations = [];
    try {
      recommendations = JSON.parse(data.response ?? "[]");
    } catch {
      recommendations = [];
    }
    res.json({ recommendations, based_on: history.length });
  } catch {
    res.status(503).json({ error: "Ollama is not reachable" });
  }
});

// GET /api/ai/search?q=
router.get("/search", async (req, res) => {
  const q = (req.query.q as string ?? "").trim();
  if (!q) return res.status(400).json({ error: "Query parameter q is required" });

  const db = getDb();

  // Basic keyword search in media library
  const results = db.prepare(`
    SELECT id, title, type, year, description, poster, genres, rating
    FROM media_cache
    WHERE LOWER(title) LIKE LOWER(?)
       OR LOWER(description) LIKE LOWER(?)
       OR LOWER(genres) LIKE LOWER(?)
    ORDER BY rating DESC NULLS LAST, year DESC NULLS LAST
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);

  if (results.length > 0) {
    return res.json({ results, source: "local" });
  }

  // If no local results, ask Ollama for suggestions
  try {
    const fetch = (await import("node-fetch")).default;
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: (req.query.model as string) ?? "llama3.2",
        prompt: `Semantic search for media: "${q}". Return top 5 relevant movie/show titles as JSON array with fields: title, year, type (movie|series), reason.`,
        stream: false,
        format: "json",
      }),
    });

    if (ollamaRes.ok) {
      const data = (await ollamaRes.json()) as { response?: string };
      let suggestions = [];
      try { suggestions = JSON.parse(data.response ?? "[]"); } catch { /* ignore */ }
      return res.json({ results: [], suggestions, source: "ai" });
    }
  } catch { /* ignore */ }

  res.json({ results: [], source: "local" });
});

export default router;
