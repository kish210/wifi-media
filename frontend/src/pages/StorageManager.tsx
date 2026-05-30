import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  HardDrive, Film, Tv2, Music, Trash2, RefreshCw,
  FolderOpen, Image, Archive,
} from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FolderStat {
  name: string;
  path: string;
  size: number;
  file_count: number;
  category: string;
  cleanable: boolean;
}

interface StorageStats {
  total: number;
  used: number;
  free: number;
  breakdown: {
    movies: number;
    series: number;
    music: number;
    photos: number;
    cache: number;
    other: number;
  };
  counts: {
    movies: number;
    series: number;
    music: number;
    photos: number;
  };
  folders: FolderStat[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtGB(b: number): string {
  return `${(b / 1e9).toFixed(1)} GB`;
}

function fmtMB(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  return `${(b / 1e6).toFixed(0)} MB`;
}

const SEGMENT_CONFIG = [
  { key: "movies",  label: "Movies",  color: "bg-brand-blue",   textColor: "text-brand-blue" },
  { key: "series",  label: "Series",  color: "bg-brand-purple", textColor: "text-brand-purple" },
  { key: "music",   label: "Music",   color: "bg-pink-400",     textColor: "text-pink-400" },
  { key: "photos",  label: "Photos",  color: "bg-brand-teal",   textColor: "text-brand-teal" },
  { key: "cache",   label: "Cache",   color: "bg-red-400",      textColor: "text-red-400" },
  { key: "other",   label: "Other",   color: "bg-white/20",     textColor: "text-white/40" },
] as const;

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  movies:  <Film size={14} />,
  series:  <Tv2 size={14} />,
  music:   <Music size={14} />,
  photos:  <Image size={14} />,
  cache:   <Trash2 size={14} />,
  other:   <Archive size={14} />,
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StorageManager() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["storage-stats"],
    queryFn: () => api.get("/storage/stats").then((r) => r.data),
    staleTime: 30_000,
  });

  const cleanCacheMut = useMutation({
    mutationFn: (path?: string) =>
      path ? api.delete(`/storage/cache?path=${encodeURIComponent(path)}`) : api.delete("/storage/cache"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage-stats"] }),
  });

  const rescanMut = useMutation({
    mutationFn: () => api.post("/storage/rescan"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["storage-stats"] }),
  });

  const stats: StorageStats | undefined = data;

  if (isLoading) return <Spinner className="h-64" />;

  const used = stats?.used ?? 0;
  const total = stats?.total ?? 1;
  const free = stats?.free ?? 0;
  const breakdown = stats?.breakdown ?? { movies: 0, series: 0, music: 0, photos: 0, cache: 0, other: 0 };
  const counts = stats?.counts ?? { movies: 0, series: 0, music: 0, photos: 0 };
  const folders: FolderStat[] = stats?.folders ?? [];

  const usedPct = (used / total) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <HardDrive size={20} className="text-brand-blue" />
          <h2 className="text-xl font-semibold">Storage Manager</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => rescanMut.mutate()}
            disabled={rescanMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-sm font-medium hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={rescanMut.isPending ? "animate-spin" : ""} />
            Rescan Library
          </button>
          <button
            onClick={() => cleanCacheMut.mutate()}
            disabled={cleanCacheMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            Clean Cache
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Storage", value: fmtGB(total), icon: HardDrive, color: "text-white/60", bg: "bg-white/[0.04]" },
          { label: "Used",          value: fmtGB(used),  icon: FolderOpen, color: "text-brand-blue", bg: "bg-brand-blue/10" },
          { label: "Free",          value: fmtGB(free),  icon: HardDrive, color: "text-brand-teal", bg: "bg-brand-teal/10" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass border border-white/[0.06] rounded-2xl p-5"
          >
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.bg)}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Segmented progress bar */}
      <div className="glass border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">Storage Breakdown</p>
          <p className="text-xs text-white/40">{usedPct.toFixed(1)}% used</p>
        </div>

        {/* Bar */}
        <div className="h-4 bg-base-700 rounded-full overflow-hidden flex mb-4">
          {SEGMENT_CONFIG.map((seg) => {
            const segBytes = breakdown[seg.key] ?? 0;
            const pct = (segBytes / total) * 100;
            if (pct < 0.5) return null;
            return (
              <motion.div
                key={seg.key}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                className={clsx("h-full", seg.color)}
                title={`${seg.label}: ${fmtMB(segBytes)}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SEGMENT_CONFIG.map((seg) => {
            const segBytes = breakdown[seg.key] ?? 0;
            return (
              <div key={seg.key} className="flex items-center gap-2 text-xs">
                <span className={clsx("w-2.5 h-2.5 rounded-sm", seg.color)} />
                <span className="text-white/50">{seg.label}</span>
                <span className="text-white/30">{fmtMB(segBytes)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Movies",  count: counts.movies,  icon: Film,  color: "text-brand-blue" },
          { label: "Series",  count: counts.series,  icon: Tv2,   color: "text-brand-purple" },
          { label: "Music",   count: counts.music,   icon: Music, color: "text-pink-400" },
          { label: "Photos",  count: counts.photos,  icon: Image, color: "text-brand-teal" },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/[0.06] rounded-xl p-4">
            <s.icon size={16} className={clsx(s.color, "mb-2")} />
            <p className="text-2xl font-bold">{s.count.toLocaleString()}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label} files</p>
          </div>
        ))}
      </div>

      {/* Per-folder breakdown */}
      <div className="glass border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <h3 className="font-semibold text-sm">Folder Breakdown</h3>
        </div>
        {folders.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-sm">No folder data available</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {folders.map((folder) => {
              const pct = (folder.size / used) * 100;
              const segCfg = SEGMENT_CONFIG.find((s) => s.key === folder.category);
              return (
                <div key={folder.path} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className={clsx("text-white/40", segCfg?.textColor)}>
                    {CATEGORY_ICON[folder.category] ?? <FolderOpen size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{folder.name}</p>
                      <span className="text-xs text-white/30 font-mono">{folder.file_count} files</span>
                    </div>
                    <div className="h-1 bg-base-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={clsx("h-full rounded-full", segCfg?.color ?? "bg-white/20")}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{fmtMB(folder.size)}</p>
                    <p className="text-xs text-white/30">{pct.toFixed(1)}%</p>
                  </div>
                  {folder.cleanable && (
                    <button
                      onClick={() => cleanCacheMut.mutate(folder.path)}
                      disabled={cleanCacheMut.isPending}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Clean
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
