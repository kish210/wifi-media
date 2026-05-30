import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, AlertTriangle, Info, Bus, X, Send,
  Users, MessageSquare, Eye, Clock, Shield,
} from "lucide-react";
import api from "@/services/api";
import { getSocket } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import Spinner from "@/components/ui/Spinner";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info" | "transport";

interface BroadcastAlert {
  id: string;
  severity: Severity;
  message: string;
  target: string;
  sent_at: number;
  read_count: number;
  device_count: number;
  sent_by: string;
}

interface BroadcastStats {
  messages_today: number;
  connected_devices: number;
  read_rate: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  badge: string;
}> = {
  critical: {
    label: "Critical",
    icon: <AlertTriangle size={14} />,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
  },
  warning: {
    label: "Warning",
    icon: <AlertTriangle size={14} />,
    bg: "bg-brand-amber/10",
    border: "border-brand-amber/30",
    text: "text-brand-amber",
    badge: "bg-brand-amber/20 text-brand-amber",
  },
  info: {
    label: "Info",
    icon: <Info size={14} />,
    bg: "bg-brand-blue/10",
    border: "border-brand-blue/30",
    text: "text-brand-blue",
    badge: "bg-brand-blue/20 text-brand-blue",
  },
  transport: {
    label: "Transport",
    icon: <Bus size={14} />,
    bg: "bg-brand-purple/10",
    border: "border-brand-purple/30",
    text: "text-brand-purple",
    badge: "bg-brand-purple/20 text-brand-purple",
  },
};

const TARGETS = ["All Passengers", "Economy Class", "Business Class", "Crew Only"];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Broadcast() {
  const { user, token } = useAuthStore();
  const qc = useQueryClient();

  const [severity, setSeverity] = useState<Severity>("info");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("All Passengers");
  const [realtimeAlerts, setRealtimeAlerts] = useState<BroadcastAlert[]>([]);

  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: ["broadcast-active"],
    queryFn: () => api.get("/broadcast/active").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ["broadcast-stats"],
    queryFn: () => api.get("/broadcast/stats").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ["broadcast-history"],
    queryFn: () => api.get("/broadcast/history").then((r) => r.data),
  });

  const sendMut = useMutation({
    mutationFn: () => api.post("/broadcast", { severity, message, target }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["broadcast-active"] });
      qc.invalidateQueries({ queryKey: ["broadcast-stats"] });
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
    },
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => api.delete(`/broadcast/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["broadcast-active"] });
    },
  });

  // Real-time via socket
  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);
    const handler = (alert: BroadcastAlert) => {
      setRealtimeAlerts((prev) => [alert, ...prev.slice(0, 49)]);
    };
    sock.on("broadcast:new", handler);
    return () => { sock.off("broadcast:new", handler); };
  }, [token]);

  const activeAlerts: BroadcastAlert[] = activeData?.alerts ?? [];
  const history: BroadcastAlert[] = historyData?.history ?? [];
  const stats: BroadcastStats = statsData ?? { messages_today: 0, connected_devices: 0, read_rate: 0 };

  const sevCfg = SEVERITY_CONFIG[severity];

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/30">
        <Shield size={40} className="mb-3" />
        <p className="font-medium">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Radio size={20} className="text-red-400" />
        <h2 className="text-xl font-semibold">Emergency Broadcast</h2>
        <span className="flex items-center gap-1 ml-2 text-xs text-red-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Admin Only
        </span>
      </div>

      {/* Real-time incoming indicator */}
      <AnimatePresence>
        {realtimeAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-sm flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
            {realtimeAlerts.length} new broadcast{realtimeAlerts.length > 1 ? "s" : ""} received in real-time
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Compose form */}
          <div className="glass border border-white/[0.06] rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Send size={15} className="text-brand-blue" />
              Compose Broadcast
            </h3>

            {/* Severity selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => {
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all",
                      severity === sev
                        ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                        : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white"
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Target selector */}
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-1.5 block">Target Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={clsx(
                      "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                      target === t
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="text-xs text-white/40 mb-1.5 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your broadcast message…"
                rows={4}
                className="input w-full resize-none"
              />
              <p className="text-[10px] text-white/20 mt-1">{message.length}/500 characters</p>
            </div>

            {/* Send button */}
            <button
              onClick={() => sendMut.mutate()}
              disabled={!message.trim() || sendMut.isPending}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border transition-all disabled:opacity-40",
                sevCfg.bg, sevCfg.border, sevCfg.text,
                "hover:opacity-80"
              )}
            >
              {sendMut.isPending ? (
                <>Sending…</>
              ) : (
                <>
                  <Send size={14} />
                  Send to {target}
                  <span className="text-xs opacity-60">
                    ({stats.connected_devices} devices)
                  </span>
                </>
              )}
            </button>

            {sendMut.isSuccess && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-brand-teal mt-2"
              >
                Broadcast sent successfully
              </motion.p>
            )}
          </div>

          {/* Active alerts */}
          <div className="glass border border-white/[0.06] rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              Active Alerts
              {activeAlerts.length > 0 && (
                <span className="text-xs text-white/40 font-normal">({activeAlerts.length})</span>
              )}
            </h3>

            {loadingActive ? (
              <Spinner className="h-16" />
            ) : activeAlerts.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-4">No active alerts</p>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map((alert) => {
                  const cfg = SEVERITY_CONFIG[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className={clsx("flex items-start gap-3 p-3 rounded-xl border", cfg.bg, cfg.border)}
                    >
                      <span className={cfg.text}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", cfg.badge)}>
                            {cfg.label.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-white/30">{alert.target}</span>
                        </div>
                        <p className={clsx("text-sm", cfg.text)}>{alert.message}</p>
                        <p className="text-[10px] text-white/30 mt-1">
                          {new Date(alert.sent_at * 1000).toLocaleTimeString()} · by {alert.sent_by} · {alert.read_count}/{alert.device_count} read
                        </p>
                      </div>
                      <button
                        onClick={() => dismissMut.mutate(alert.id)}
                        className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/30 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sent Today",    value: stats.messages_today,                    icon: MessageSquare, color: "text-brand-blue" },
              { label: "Connected",     value: stats.connected_devices,                 icon: Users,         color: "text-brand-teal" },
              { label: "Read Rate",     value: `${Math.round(stats.read_rate * 100)}%`, icon: Eye,           color: "text-brand-purple" },
            ].map((s) => (
              <div key={s.label} className="glass border border-white/[0.06] rounded-xl p-4 text-center">
                <s.icon size={16} className={clsx(s.color, "mx-auto mb-2")} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Broadcast history */}
          <div className="glass border border-white/[0.06] rounded-2xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock size={14} className="text-white/40" />
              History
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-4">No broadcast history</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                {history.map((h) => {
                  const cfg = SEVERITY_CONFIG[h.severity];
                  return (
                    <div key={h.id} className="flex items-start gap-2 py-2 border-b border-white/[0.04] last:border-0">
                      <span className={clsx("mt-0.5 shrink-0", cfg.text)}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{h.message}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={clsx("text-[10px] font-bold", cfg.text)}>{cfg.label}</span>
                          <span className="text-[10px] text-white/20">·</span>
                          <span className="text-[10px] text-white/30">{h.target}</span>
                          <span className="text-[10px] text-white/20">·</span>
                          <span className="text-[10px] text-white/30">
                            {new Date(h.sent_at * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-white/40">{h.read_count}/{h.device_count}</p>
                        <p className="text-[10px] text-white/20">read</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
