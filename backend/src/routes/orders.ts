import { Router } from "express";
import { z } from "zod";
import { authenticate, requireAdmin } from "../middleware/auth";
import { getDb } from "../db/schema";
import { v4 as uuidv4 } from "uuid";
import { io } from "../websocket";

const router = Router();

function initTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id),
      seat        TEXT NOT NULL,
      items       TEXT NOT NULL,
      note        TEXT,
      total       INTEGER DEFAULT 0,
      status      TEXT DEFAULT 'pending',
      created_at  INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  `);
}

let initialized = false;
function ensureInit() {
  if (!initialized) {
    initTables();
    initialized = true;
  }
}

const MENU = {
  food: [
    { id: "food-pizza",    name: "Pizza",    price: 85000, description: "Classic Margherita pizza", category: "food" },
    { id: "food-burger",   name: "Burger",   price: 65000, description: "Beef burger with fries",   category: "food" },
    { id: "food-pasta",    name: "Pasta",    price: 72000, description: "Creamy pasta carbonara",   category: "food" },
    { id: "food-salad",    name: "Salad",    price: 42000, description: "Fresh garden salad",       category: "food" },
    { id: "food-kebab",    name: "Kebab",    price: 95000, description: "Traditional Persian kebab",category: "food" },
    { id: "food-sandwich", name: "Sandwich", price: 48000, description: "Club sandwich",            category: "food" },
  ],
  drinks: [
    { id: "drink-tea",     name: "Tea",     price: 12000, description: "Hot Persian tea",    category: "drinks" },
    { id: "drink-coffee",  name: "Coffee",  price: 22000, description: "Espresso or latte",  category: "drinks" },
    { id: "drink-juice",   name: "Juice",   price: 28000, description: "Fresh fruit juice",  category: "drinks" },
    { id: "drink-water",   name: "Water",   price: 8000,  description: "Bottled water 500ml",category: "drinks" },
  ],
  snacks: [
    { id: "snack-chips",   name: "Chips",   price: 18000, description: "Crispy potato chips", category: "snacks" },
    { id: "snack-nuts",    name: "Nuts",    price: 25000, description: "Mixed roasted nuts",  category: "snacks" },
    { id: "snack-nachos",  name: "Nachos",  price: 32000, description: "Nachos with salsa",   category: "snacks" },
  ],
  desserts: [
    { id: "dessert-cake",      name: "Cake",      price: 38000, description: "Slice of chocolate cake", category: "desserts" },
    { id: "dessert-icecream",  name: "Ice Cream", price: 28000, description: "Two scoops ice cream",    category: "desserts" },
    { id: "dessert-baklava",   name: "Baklava",   price: 22000, description: "Traditional baklava",      category: "desserts" },
  ],
};

const ALL_MENU_ITEMS = [
  ...MENU.food,
  ...MENU.drinks,
  ...MENU.snacks,
  ...MENU.desserts,
];

const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1).max(20),
  price: z.number().int().min(0),
});

const createOrderSchema = z.object({
  seat: z.string().min(1).max(32),
  items: z.array(orderItemSchema).min(1).max(20),
  note: z.string().max(500).optional(),
  total: z.number().int().min(0),
});

const ORDER_STATUSES = ["pending", "preparing", "ready", "delivered", "cancelled"] as const;

// GET /api/orders/menu
router.get("/menu", (req, res) => {
  res.json({
    menu: MENU,
    currency: "Toman",
    items: ALL_MENU_ITEMS,
  });
});

// GET /api/orders
router.get("/", authenticate, (req, res) => {
  ensureInit();
  const db = getDb();
  const isAdmin = req.user!.role === "admin";

  let query: string;
  let params: string[];

  if (isAdmin) {
    const { status } = req.query as Record<string, string>;
    if (status) {
      query = `
        SELECT o.*, u.username, u.display_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.status = ?
        ORDER BY o.created_at DESC
      `;
      params = [status];
    } else {
      query = `
        SELECT o.*, u.username, u.display_name
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 200
      `;
      params = [];
    }
  } else {
    query = `
      SELECT o.*, u.username, u.display_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      LIMIT 50
    `;
    params = [req.user!.userId];
  }

  const orders = db.prepare(query).all(...params) as (Record<string, unknown> & { items: string })[];

  const parsed = orders.map((order) => ({
    ...order,
    items: (() => { try { return JSON.parse(order.items); } catch { return []; } })(),
  }));

  res.json({ orders: parsed });
});

// POST /api/orders
router.post("/", authenticate, (req, res) => {
  ensureInit();
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const db = getDb();
  const { seat, items, note, total } = parsed.data;
  const id = uuidv4();

  db.prepare(`
    INSERT INTO orders (id, user_id, seat, items, note, total, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, req.user!.userId, seat, JSON.stringify(items), note ?? null, total);

  const order = db.prepare(`
    SELECT o.*, u.username, u.display_name
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get(id) as (Record<string, unknown> & { items: string }) | undefined;

  if (order) {
    const enriched = {
      ...order,
      items: (() => { try { return JSON.parse(order.items); } catch { return items; } })(),
    };

    if (io) {
      io.emit("order:new", enriched);
    }

    return res.status(201).json(enriched);
  }

  res.status(201).json({ id, seat, items, note, total, status: "pending" });
});

// PUT /api/orders/:id/status
router.put("/:id/status", authenticate, requireAdmin, (req, res) => {
  ensureInit();
  const { status } = req.body as { status: string };
  if (!ORDER_STATUSES.includes(status as typeof ORDER_STATUSES[number])) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(", ")}` });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);

  const order = db.prepare(`
    SELECT o.*, u.username, u.display_name
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get(req.params.id) as (Record<string, unknown> & { items: string }) | undefined;

  if (order) {
    const enriched = {
      ...order,
      items: (() => { try { return JSON.parse(order.items); } catch { return []; } })(),
    };
    if (io) {
      io.emit("order:status_updated", enriched);
    }
    return res.json(enriched);
  }

  res.json({ ok: true });
});

export default router;
