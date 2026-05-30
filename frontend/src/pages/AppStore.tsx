import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Download, Trash2, RefreshCw, Upload, Usb, X,
  CheckCircle, Package, ExternalLink, ChevronDown,
} from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppItem {
  id: string;
  name: string;
  description: string;
  category: "Apps" | "Games" | "Tools" | "Media";
  icon: string;
  version: string;
  size: number;
  installed: boolean;
  updatable: boolean;
  source: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}

const CATEGORIES = ["All", "Apps", "Games", "Tools", "Media"] as const;
type Category = (typeof CATEGORIES)[number];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AppStore() {
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["appstore"],
    queryFn: () => api.get("/appstore").then((r) => r.data),
    staleTime: 30_000,
  });

  const installMut = useMutation({
    mutationFn: (id: string) => api.post(`/appstore/${id}/install`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appstore"] }),
  });

  const uninstallMut = useMutation({
    mutationFn: (id: string) => api.delete(`/appstore/${id}/install`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appstore"] }),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => api.post(`/appstore/${id}/update`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appstore"] }),
  });

  const uploadApkMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("apk", file);
      return api.post("/appstore/upload-apk", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appstore"] }),
  });

  const apps: AppItem[] = data?.apps ?? [];

  const filtered = apps.filter((a) => {
    const matchCat = category === "All" || a.category === category;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c] = c === "All" ? apps.length : apps.filter((a) => a.category === c).length;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-brand-purple" />
          <h2 className="text-xl font-semibold">App Store</h2>
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-xs text-brand-teal font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
          kishwifi.com
          <ExternalLink size={10} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-sm font-medium hover:bg-brand-purple/20 transition-colors"
          >
            <Upload size={14} />
            Upload APK
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.08] transition-colors">
            <Usb size={14} />
            Install from USB
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".apk"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadApkMut.mutate(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search apps…"
          className="input py-2 pl-8 w-full"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={clsx(
              "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
              category === cat
                ? "bg-brand-purple/15 text-brand-purple border-brand-purple/30"
                : "bg-white/[0.04] text-white/50 border-white/[0.06] hover:text-white"
            )}
          >
            {cat}
            <span className={clsx(
              "text-[10px] rounded-full px-1.5 py-0.5 font-bold",
              category === cat ? "bg-brand-purple/20 text-brand-purple" : "bg-white/[0.06] text-white/30"
            )}>
              {counts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <Spinner className="h-64" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Package size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No apps found</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((app, i) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="glass border border-white/[0.06] rounded-2xl p-4 hover:border-white/[0.12] transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-base-700 flex items-center justify-center text-2xl shrink-0">
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{app.name}</p>
                      {app.updatable && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber font-bold">
                          UPDATE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{app.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-white/30">v{app.version}</span>
                      <span className="text-[10px] text-white/20">•</span>
                      <span className="text-[10px] text-white/30">{fmtBytes(app.size)}</span>
                      <Badge variant="ghost" className="text-[10px] py-0 px-1.5">{app.category}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {app.installed ? (
                    <>
                      {app.updatable && (
                        <button
                          onClick={() => updateMut.mutate(app.id)}
                          disabled={updateMut.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-amber/10 border border-brand-amber/20 text-brand-amber text-xs font-medium hover:bg-brand-amber/20 transition-colors"
                        >
                          <RefreshCw size={12} className={updateMut.isPending ? "animate-spin" : ""} />
                          Update
                        </button>
                      )}
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-medium hover:bg-brand-teal/20 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Open
                      </button>
                      <button
                        onClick={() => uninstallMut.mutate(app.id)}
                        disabled={uninstallMut.isPending}
                        className="w-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => installMut.mutate(app.id)}
                      disabled={installMut.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-medium hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
                    >
                      <Download size={12} className={installMut.isPending ? "animate-bounce" : ""} />
                      Install
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
