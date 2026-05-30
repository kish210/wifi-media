import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Plus, Minus, Send, Utensils, X,
  Coffee, Cookie, IceCream, Flame,
} from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  calories: number;
  price: number;     // Toman
  category: "Food" | "Drinks" | "Snacks" | "Desserts";
  available: boolean;
}

type CartState = Record<string, number>; // itemId → quantity

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtToman(n: number): string {
  return n.toLocaleString("fa-IR") + " T";
}

const CATEGORIES = ["Food", "Drinks", "Snacks", "Desserts"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  Food:     <Utensils size={14} />,
  Drinks:   <Coffee size={14} />,
  Snacks:   <Cookie size={14} />,
  Desserts: <IceCream size={14} />,
};

// ── Quantity counter ──────────────────────────────────────────────────────────

function QuantityCounter({
  qty,
  onInc,
  onDec,
}: {
  qty: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onDec}
        className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/60 hover:text-white transition-colors"
      >
        <Minus size={12} />
      </button>
      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
      <button
        onClick={onInc}
        className="w-7 h-7 rounded-lg bg-brand-blue/20 hover:bg-brand-blue/30 flex items-center justify-center text-brand-blue transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FoodOrder() {
  const [category, setCategory] = useState<Category>("Food");
  const [cart, setCart] = useState<CartState>({});
  const [seatNumber, setSeatNumber] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [orderSent, setOrderSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["orders-menu"],
    queryFn: () => api.get("/orders/menu").then((r) => r.data),
    staleTime: 60_000,
  });

  const orderMut = useMutation({
    mutationFn: () =>
      api.post("/orders", {
        items: Object.entries(cart).map(([id, qty]) => ({ id, qty })),
        seat: seatNumber,
        note: staffNote,
      }),
    onSuccess: () => {
      setCart({});
      setStaffNote("");
      setOrderSent(true);
      setTimeout(() => setOrderSent(false), 4000);
    },
  });

  const menu: MenuItem[] = data?.items ?? [];
  const filtered = menu.filter((item) => item.category === category);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menu.find((m) => m.id === id);
    return sum + (item?.price ?? 0) * qty;
  }, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      if (n <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [id]: n };
    });

  return (
    <div className="max-w-5xl mx-auto pb-32 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Utensils size={20} className="text-brand-amber" />
        <h2 className="text-xl font-semibold">Food & Beverage</h2>
      </div>

      {/* Seat + note inputs */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-white/40 mb-1.5 block">Seat / Room Number</label>
          <input
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            placeholder="e.g. 12A or Room 305"
            className="input w-full py-2.5"
          />
        </div>
        <div className="flex-[2] min-w-[240px]">
          <label className="text-xs text-white/40 mb-1.5 block">Note for staff (optional)</label>
          <input
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            placeholder="e.g. No ice, allergy info…"
            className="input w-full py-2.5"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={clsx(
              "shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              category === cat
                ? "bg-brand-amber/15 text-brand-amber border-brand-amber/30"
                : "bg-white/[0.04] text-white/50 border-white/[0.06] hover:text-white"
            )}
          >
            {CATEGORY_ICON[cat]}
            {cat}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      {isLoading ? (
        <Spinner className="h-48" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <span className="text-4xl mb-3">🍽️</span>
          <p className="text-sm">No items in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => {
              const qty = cart[item.id] ?? 0;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className={clsx(
                    "glass border rounded-2xl p-4 transition-all",
                    qty > 0
                      ? "border-brand-amber/30 bg-brand-amber/[0.03]"
                      : "border-white/[0.06] hover:border-white/[0.12]",
                    !item.available && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-base-700 flex items-center justify-center text-2xl shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Flame size={10} />
                          {item.calories} kcal
                        </span>
                        <span className="text-xs font-semibold text-brand-amber">
                          {fmtToman(item.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    {!item.available ? (
                      <span className="text-xs text-white/30">Unavailable</span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => inc(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-amber/10 border border-brand-amber/20 text-brand-amber text-xs font-medium hover:bg-brand-amber/20 transition-colors"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    ) : (
                      <QuantityCounter
                        qty={qty}
                        onInc={() => inc(item.id)}
                        onDec={() => dec(item.id)}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Sticky order bar */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="backdrop-blur-xl bg-base-800/90 border border-white/[0.12] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl">
              <div className="relative">
                <ShoppingCart size={20} className="text-brand-amber" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-amber text-[10px] font-bold text-black flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{totalItems} item{totalItems > 1 ? "s" : ""}</p>
                <p className="text-xs text-white/40">{fmtToman(totalPrice)}</p>
              </div>
              {!seatNumber && (
                <p className="text-xs text-brand-amber/70">Add seat/room number</p>
              )}
              <button
                onClick={() => orderMut.mutate()}
                disabled={orderMut.isPending || !seatNumber}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-amber text-black font-semibold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {orderMut.isPending ? "Sending…" : "Send Order"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {orderSent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-brand-teal text-black font-semibold text-sm px-5 py-3 rounded-xl shadow-xl"
          >
            ✓ Order sent! Staff will bring it shortly.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
