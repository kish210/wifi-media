import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Gauge, Mountain, Route, Clock, MapPin, CloudSun,
  Navigation, ChevronRight,
} from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stop {
  id: string;
  name: string;
  distance_km: number;
  eta: string;
  passed: boolean;
  current: boolean;
}

interface WeatherData {
  condition: string;
  temp_c: number;
  icon: string;
}

interface JourneyData {
  speed_kmh: number;
  altitude_m: number;
  distance_km: number;
  eta: string;
  lat: number;
  lng: number;
  route_polyline: [number, number][];
  stops: Stop[];
  origin: string;
  destination: string;
  weather_destination: WeatherData | null;
  progress_pct: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  color: string;
}) {
  return (
    <div className="glass border border-white/[0.06] rounded-2xl p-4 flex-1">
      <div className={clsx("mb-2", color)}>{icon}</div>
      <p className="text-2xl font-bold">
        {value}
        {unit && <span className="text-sm font-normal text-white/40 ml-1">{unit}</span>}
      </p>
      <p className="text-xs text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JourneyInfo() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["journey"],
    queryFn: () => api.get("/journey").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const journey: JourneyData | null = data ?? null;

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    async function initMap() {
      // Dynamically import leaflet
      const L = (await import("leaflet")).default;

      // Fix default icon paths
      // @ts-expect-error leaflet icon internals
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) return; // already initialized

      const defaultCenter: [number, number] = journey ? [journey.lat, journey.lng] : [35.6892, 51.3890];
      const defaultZoom = 10;

      map = L.map(mapContainerRef.current!, { zoomControl: true, attributionControl: false });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "map-dark-tiles",
      }).addTo(map);

      map.setView(defaultCenter, defaultZoom);
      mapRef.current = map;

      // Custom vehicle marker
      const vehicleIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:linear-gradient(135deg,#3b82f6,#8b5cf6);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 4px rgba(59,130,246,0.25),0 4px 12px rgba(0,0,0,0.5);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4 7v13h16V7L12 2z"/>
          </svg>
        </div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (journey) {
        markerRef.current = L.marker([journey.lat, journey.lng], { icon: vehicleIcon }).addTo(map);

        if (journey.route_polyline?.length > 1) {
          polylineRef.current = L.polyline(journey.route_polyline, {
            color: "#3b82f6",
            weight: 4,
            opacity: 0.8,
            dashArray: undefined,
          }).addTo(map);
          map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
        }
      }
    }

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      polylineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when data changes
  useEffect(() => {
    if (!journey || !mapRef.current) return;

    const updateMap = async () => {
      const L = (await import("leaflet")).default;
      const latLng: [number, number] = [journey.lat, journey.lng];

      if (markerRef.current) {
        markerRef.current.setLatLng(latLng);
      }

      if (journey.route_polyline?.length > 1) {
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(journey.route_polyline);
        } else {
          polylineRef.current = L.polyline(journey.route_polyline, {
            color: "#3b82f6",
            weight: 4,
            opacity: 0.8,
          }).addTo(mapRef.current!);
        }
      }
    };

    updateMap();
  }, [journey]);

  if (isLoading) return <Spinner className="h-64" />;

  const stops: Stop[] = journey?.stops ?? [];
  const currentStopIdx = stops.findIndex((s) => s.current);
  const nextStop = stops.find((s) => !s.passed && !s.current) ?? null;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Dark tile CSS */}
      <style>{`
        .map-dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(0.72) contrast(1.1) saturate(0.8);
        }
        .leaflet-container {
          background: #0a0a0f;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-2">
        <Navigation size={20} className="text-brand-blue" />
        <h2 className="text-xl font-semibold">Journey Information</h2>
        {journey && (
          <span className="text-white/40 text-sm">
            {journey.origin} <ChevronRight size={12} className="inline" /> {journey.destination}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <StatCard
          icon={<Gauge size={16} />}
          label="Speed"
          value={journey?.speed_kmh ?? 0}
          unit="km/h"
          color="text-brand-blue"
        />
        <StatCard
          icon={<Mountain size={16} />}
          label="Altitude"
          value={journey?.altitude_m ?? 0}
          unit="m"
          color="text-brand-teal"
        />
        <StatCard
          icon={<Route size={16} />}
          label="Distance"
          value={journey?.distance_km?.toFixed(1) ?? "—"}
          unit="km"
          color="text-brand-purple"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="ETA"
          value={journey?.eta ?? "—"}
          color="text-brand-amber"
        />
      </div>

      {/* Main area */}
      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/[0.06]" style={{ height: "420px" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
          {!journey && (
            <div className="absolute inset-0 flex items-center justify-center bg-base-900/80 text-white/30 text-sm">
              <div className="text-center">
                <Navigation size={32} className="mx-auto mb-2 opacity-30" />
                <p>No journey data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto" style={{ maxHeight: "420px" }}>
          {/* Route progress */}
          {journey && (
            <div className="glass border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Route Progress</p>
                <span className="text-xs text-white/40">{journey.progress_pct?.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-base-700 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${journey.progress_pct ?? 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-teal"
                />
              </div>
              {/* Stop dots */}
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-white/[0.06]" />
                <div className="space-y-3">
                  {stops.map((stop) => (
                    <div key={stop.id} className="flex items-center gap-3 pl-6 relative">
                      <div className={clsx(
                        "absolute left-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        stop.current
                          ? "border-brand-blue bg-brand-blue/20"
                          : stop.passed
                          ? "border-brand-teal bg-brand-teal/20"
                          : "border-white/20 bg-base-800"
                      )}>
                        {stop.current && <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />}
                        {stop.passed && <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          "text-xs font-medium truncate",
                          stop.current ? "text-brand-blue" : stop.passed ? "text-white/40" : "text-white/70"
                        )}>
                          {stop.name}
                          {stop.current && <span className="ml-1 text-[10px] text-brand-blue font-bold">● NOW</span>}
                        </p>
                        {!stop.passed && (
                          <p className="text-[10px] text-white/30">{stop.eta}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Next stop */}
          {nextStop && (
            <div className="glass border border-brand-blue/20 rounded-2xl p-4 bg-brand-blue/5">
              <p className="text-xs text-brand-blue font-semibold mb-1 flex items-center gap-1">
                <MapPin size={10} /> NEXT STOP
              </p>
              <p className="font-semibold">{nextStop.name}</p>
              <p className="text-sm text-white/50 mt-0.5">{nextStop.eta}</p>
              <p className="text-xs text-white/30">{nextStop.distance_km} km away</p>
            </div>
          )}

          {/* Weather at destination */}
          {journey?.weather_destination && (
            <div className="glass border border-white/[0.06] rounded-2xl p-4">
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
                <CloudSun size={10} /> Weather at {journey.destination}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{journey.weather_destination.icon}</span>
                <div>
                  <p className="font-semibold">{journey.weather_destination.temp_c}°C</p>
                  <p className="text-xs text-white/50">{journey.weather_destination.condition}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
