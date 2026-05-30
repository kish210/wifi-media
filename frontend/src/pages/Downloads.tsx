import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Pause, X, CheckCircle, Clock, Package,
  HardDrive, ExternalLink, Usb, RefreshCw, ChevronRight,
  AlertCircle,
} from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveDownload {
  id: string;
  name: string;
  size: number;       // bytes
  downloaded: number; // bytes
  speed: number;      // bytes/s
  eta: number;        // seconds
  status: "downloading" | "paused" | "error";
  category: string;
}

interface DownloadPackage {
  id: string;
  name: string;
  description: string;
  size: number;
  category: string;
  icon: string;
  version: string;
  source: string;
}

interface DownloadHistory {
  id: string;
  name: string;
  size: number;
  completed_at: number;
  category: string;
  status: "completed" | "failed";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}

function fmtEta(s: number): string {
  if (s <= 0) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

const CATEGORY_COLOR: Record<string, string> = {
  movies: "text-brand-blue",
  series: "text-brand-purple",
  music: "text-pink-400",
  apps: "text-brand-teal",
  maps: "text-brand-amber",
  games: "text-orange-400",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Downloads() {
  const qc = useQueryClient();

  const { data: downloadsData, isLoading: loadingDownloads } = useQuery({
    queryKey: ["downloads"],
    queryFn: () => api.get("/downloads").then((r) => r.data),
    refetchInterval: 2_000,
  });

  const { data: packagesData, isLoading: loadingPackages } = useQuery({
    queryKey: ["download-packages"],
    queryFn: () => api.get("/downloads/packages").then((r) => r.data),
    staleTime: 60_000,
  });

  const startMut = useMutation({
    mutationFn: (packageId: string) => api.post("/downloads/start", { package_id: packageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const pauseMut = useMutation({
    mutationFn: (id: string) => api.post(`/downloads/${id}/pause`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.delete(`/downloads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });

  const active: ActiveDownload[] = downloadsData?.active ?? [];
  const history: DownloadHistory[] = downloadsData?.history ?? [];
  const packages: DownloadPackage[] = packagesData?.packages ?? [];

  // group packages by category
  const pkgCategories = [...new Set(packages.map((p) => p.category))];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Download size={20} className="text-brand-blue" />
          <h2 className="text-xl font-semibold">Downloads</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://kishwifi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-sm font-medium hover:bg-brand-blue/20 transition-colors"
          >
            <ExternalLink size={14} />
            Browse kishwifi.com
          </a>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.08] transition-colors">
            <Usb size={14} />
            Import from USB
          </button>
        </div>
      </div>

      {/* Active downloads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            Active Downloads
            {active.length > 0 && (
              <span className="text-xs text-white/40 font-normal ml-1">({active.length})</span>
            )}
          </h3>
        </div>

        {loadingDownloads ? (
          <Spinner className="h-24" />
        ) : active.length === 0 ? (
          <div className="glass border border-white/[0.06] rounded-2xl p-8 text-center text-white/30">
            <Download size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active downloads</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {active.map((dl) => {
                const pct = dl.size > 0 ? Math.round((dl.downloaded / dl.size) * 100) : 0;
                return (
                  <motion.div
                    key={dl.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass border border-white/[0.06] rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{dl.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                          <span className={clsx("font-medium", CATEGORY_COLOR[dl.category] ?? "text-white/40")}>
                            {dl.category}
                          </span>
                          <span>{fmtBytes(dl.downloaded)} / {fmtBytes(dl.size)}</span>
                          <span className="flex items-center gap-1">
                            <RefreshCw size={10} className={dl.status === "downloading" ? "animate-spin" : ""} />
                            {dl.status === "downloading" ? `${fmtBytes(dl.speed)}/s` : dl.status}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            ETA: {fmtEta(dl.eta)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => pauseMut.mutate(dl.id)}
                          className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-brand-amber/20 flex items-center justify-center text-white/40 hover:text-brand-amber transition-colors"
                          title="Pause"
                        >
                          <Pause size={13} />
                        </button>
                        <button
                          onClick={() => cancelMut.mutate(dl.id)}
                          className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-base-700 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ ease: "linear", duration: 0.5 }}
                        className={clsx(
                          "h-full rounded-full",
                          dl.status === "error"
                            ? "bg-red-500"
                            : dl.status === "paused"
                            ? "bg-brand-amber"
                            : "bg-gradient-to-r from-brand-blue to-brand-purple"
                        )}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/30">{pct}%</span>
                      {dl.status === "error" && (
                        <span className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle size={10} /> Error
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Available packages */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Package size={16} className="text-brand-purple" />
            Available from kishwifi.com
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-brand-teal">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
            Online
          </div>
        </div>

        {loadingPackages ? (
          <Spinner className="h-32" />
        ) : packages.length === 0 ? (
          <div className="glass border border-white/[0.06] rounded-2xl p-8 text-center text-white/30">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No packages available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pkgCategories.map((cat) => (
              <div key={cat}>
                <p className={clsx("text-xs font-semibold uppercase tracking-wider mb-3", CATEGORY_COLOR[cat] ?? "text-white/40")}>
                  {cat}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {packages.filter((p) => p.category === cat).map((pkg) => (
                    <motion.div
                      key={pkg.id}
                      whileHover={{ scale: 1.01 }}
                      className="glass border border-white/[0.06] rounded-2xl p-4 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-base-700 flex items-center justify-center text-xl shrink-0">
                        {pkg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{pkg.name}</p>
                        <p className="text-xs text-white/40 truncate mt-0.5">{pkg.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-white/30">{fmtBytes(pkg.size)}</span>
                          <span className="text-xs text-white/20">v{pkg.version}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => startMut.mutate(pkg.id)}
                        disabled={startMut.isPending}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-medium hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
                      >
                        <Download size={12} />
                        Get
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Download history */}
      {history.length > 0 && (
        <section>
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <HardDrive size={16} className="text-white/40" />
            History
          </h3>
          <div className="glass border border-white/[0.06] rounded-2xl overflow-hidden">
            {history.map((h, i) => (
              <div
                key={h.id}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-sm",
                  i < history.length - 1 && "border-b border-white/[0.04]",
                  "hover:bg-white/[0.02] transition-colors"
                )}
              >
                {h.status === "completed" ? (
                  <CheckCircle size={14} className="text-brand-teal shrink-0" />
                ) : (
                  <X size={14} className="text-red-400 shrink-0" />
                )}
                <span className="flex-1 truncate">{h.name}</span>
                <span className="text-white/30 text-xs">{fmtBytes(h.size)}</span>
                <span className={clsx("text-xs font-medium", CATEGORY_COLOR[h.category] ?? "text-white/40")}>
                  {h.category}
                </span>
                <span className="text-white/30 text-xs">
                  {new Date(h.completed_at * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
