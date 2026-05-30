import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, Search, Download, Trash2, HardDrive, ZoomIn,
  CheckCircle, X, RefreshCw, MapPin,
} from "lucide-react";
import api from "@/services/api";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapRegion {
  id: string;
  name: string;
  country: string;
  size_mb: number;
  downloaded: boolean;
  tiles: number;
  last_updated: string;
  center: [number, number];
  zoom_min: number;
  zoom_max: number;
}

interface StorageBar {
  used_mb: number;
  total_mb: number;
}

// ── Zoom level config ─────────────────────────────────────────────────────────

const ZOOM_LEVELS = [
  { label: "City overview",    zoom: 12, desc: "Neighbourhoods & main roads" },
  { label: "Street level",     zoom: 15, desc: "Streets & POIs" },
  { label: "Detailed",         zoom: 17, desc: "Buildings & details" },
  { label: "Maximum detail",   zoom: 19, desc: "Full resolution" },
] as const;

// ── Quick-jump cities ─────────────────────────────────────────────────────────

const QUICK_CITIES = [
  { name: "Tehran",   center: [35.6892, 51.3890] as [number, number], zoom: 12 },
  { name: "Kish",     center: [26.5411, 53.9800] as [number, number], zoom: 13 },
  { name: "Isfahan",  center: [32.6546, 51.6680] as [number, number], zoom: 12 },
  { name: "Shiraz",   center: [29.5918, 52.5837] as [number, number], zoom: 12 },
  { name: "Mashhad",  center: [36.2605, 59.6168] as [number, number], zoom: 12 },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OfflineMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [search, setSearch] = useState("");
  const [selectedZoom, setSelectedZoom] = useState(2);
  const qc = useQueryClient();

  const { data: regionsData, isLoading } = useQuery({
    queryKey: ["tiles-regions"],
    queryFn: () => api.get("/tiles/regions").then((r) => r.data),
    staleTime: 30_000,
  });

  const downloadMut = useMutation({
    mutationFn: ({ regionId, zoom }: { regionId: string; zoom: number }) =>
      api.post("/tiles/download", { region_id: regionId, max_zoom: zoom }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles-regions"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (regionId: string) => api.delete(`/tiles/regions/${regionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiles-regions"] }),
  });

  const regions: MapRegion[] = regionsData?.regions ?? [];
  const storage: StorageBar = regionsData?.storage ?? { used_mb: 0, total_mb: 1000 };

  const filtered = regions.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.country.toLowerCase().includes(search.toLowerCase())
  );

  const downloadedRegions = regions.filter((r) => r.downloaded);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current || mapRef.current) return;

      // Fix default icon paths
      // @ts-expect-error leaflet icon internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapContainerRef.current!, {
        center: [32.4, 53.7],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "map-dark-tiles-offline",
      }).addTo(map);

      mapRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const jumpToCity = async (center: [number, number], zoom: number) => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom, { animate: true });
  };

  const storagePct = (storage.used_mb / storage.total_mb) * 100;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Dark tile CSS */}
      <style>{`
        .map-dark-tiles-offline {
          filter: invert(100%) hue-rotate(180deg) brightness(0.72) contrast(1.1) saturate(0.8);
        }
        .leaflet-container {
          background: #0a0a0f;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-2">
        <Map size={20} className="text-brand-teal" />
        <h2 className="text-xl font-semibold">Offline Maps</h2>
        <span className="text-xs text-white/30 ml-1">OpenStreetMap</span>
      </div>

      {/* Quick-jump cities */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {downloadedRegions.length > 0
          ? downloadedRegions.map((r) => (
              <button
                key={r.id}
                onClick={() => jumpToCity(r.center, 12)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-medium hover:bg-brand-teal/20 transition-colors"
              >
                <MapPin size={10} />
                {r.name}
              </button>
            ))
          : QUICK_CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => jumpToCity(city.center, city.zoom)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/50 text-xs font-medium hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <MapPin size={10} />
                {city.name}
              </button>
            ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4">
        {/* Map */}
        <div
          className="flex-1 rounded-2xl overflow-hidden border border-white/[0.06] relative"
          style={{ height: "480px" }}
        >
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 space-y-4 overflow-y-auto" style={{ maxHeight: "480px" }}>
          {/* Map storage bar */}
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <HardDrive size={14} className="text-brand-blue" />
                Map Storage
              </p>
              <span className="text-xs text-white/40">{storagePct.toFixed(0)}% used</span>
            </div>
            <div className="h-2 bg-base-700 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${storagePct}%` }}
                transition={{ duration: 0.8 }}
                className={clsx(
                  "h-full rounded-full",
                  storagePct > 85 ? "bg-red-400" : storagePct > 60 ? "bg-brand-amber" : "bg-brand-teal"
                )}
              />
            </div>
            <p className="text-xs text-white/30">
              {(storage.used_mb / 1024).toFixed(1)} GB / {(storage.total_mb / 1024).toFixed(0)} GB
            </p>
          </div>

          {/* Detail level selector */}
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <ZoomIn size={14} className="text-brand-purple" />
              Download Detail Level
            </p>
            <div className="space-y-2">
              {ZOOM_LEVELS.map((z, i) => (
                <button
                  key={z.label}
                  onClick={() => setSelectedZoom(i)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                    selectedZoom === i
                      ? "bg-brand-purple/10 border-brand-purple/20 text-white"
                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white"
                  )}
                >
                  <span className={clsx(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    selectedZoom === i ? "border-brand-purple" : "border-white/20"
                  )}>
                    {selectedZoom === i && <span className="w-2 h-2 rounded-full bg-brand-purple" />}
                  </span>
                  <div>
                    <p className="text-xs font-medium">{z.label}</p>
                    <p className="text-[10px] text-white/30">{z.desc}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-white/20">z{z.zoom}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search regions…"
              className="input py-2 pl-8 w-full"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Regions list */}
          <div className="glass border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
              <p className="text-sm font-medium">Regions</p>
              <span className="text-xs text-white/30">{filtered.length} available</span>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-white/30 text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-white/30 text-sm">No regions found</div>
            ) : (
              <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto scrollbar-hide">
                <AnimatePresence>
                  {filtered.map((region) => (
                    <motion.div
                      key={region.id}
                      layout
                      className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{region.name}</p>
                          {region.downloaded && (
                            <CheckCircle size={10} className="text-brand-teal shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/30">
                          {region.country} · {region.size_mb} MB
                          {region.downloaded && ` · ${(region.tiles / 1000).toFixed(0)}k tiles`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {region.downloaded ? (
                          <>
                            <button
                              onClick={() => jumpToCity(region.center, 12)}
                              className="w-7 h-7 rounded-lg bg-brand-teal/10 flex items-center justify-center text-brand-teal hover:bg-brand-teal/20 transition-colors"
                              title="View on map"
                            >
                              <MapPin size={11} />
                            </button>
                            <button
                              onClick={() => deleteMut.mutate(region.id)}
                              disabled={deleteMut.isPending}
                              className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              title="Delete region"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              downloadMut.mutate({
                                regionId: region.id,
                                zoom: ZOOM_LEVELS[selectedZoom].zoom,
                              })
                            }
                            disabled={downloadMut.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
                          >
                            {downloadMut.isPending ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : (
                              <Download size={10} />
                            )}
                            Get
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
