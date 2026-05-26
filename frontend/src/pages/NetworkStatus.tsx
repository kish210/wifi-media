import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Server, Users, Film, Clock, Activity, CheckCircle, XCircle } from "lucide-react";
import { networkApi } from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

export default function NetworkStatus() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["network-status"],
    queryFn: () => networkApi.status().then((r) => r.data),
    refetchInterval: 15_000,
  });

  if (isLoading) return <Spinner className="h-64" />;

  const tvhOnline = data?.tvheadend?.online;
  const uptime = data?.uptime ?? 0;
  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi size={20} className="text-brand-blue" />
          <h2 className="text-xl font-semibold">Network Status</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-ghost text-sm py-1.5"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* System cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="WiFi-Media"
          icon={<Server size={18} />}
          status="online"
          detail={`Uptime: ${fmtUptime(uptime)}`}
        />
        <StatusCard
          title="TVHeadend"
          icon={<Activity size={18} />}
          status={tvhOnline ? "online" : "offline"}
          detail={tvhOnline
            ? `${data?.tvheadend?.subscriptions ?? 0} streams`
            : "Not connected"}
        />
        <StatusCard
          title="Media Library"
          icon={<Film size={18} />}
          status="online"
          detail={`${data?.stats?.media ?? 0} files indexed`}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Users", value: data?.stats?.users ?? 0, icon: Users, color: "text-brand-blue" },
          { label: "Media Files", value: data?.stats?.media ?? 0, icon: Film, color: "text-brand-purple" },
          { label: "TVH Streams", value: data?.tvheadend?.subscriptions ?? 0, icon: Activity, color: "text-brand-teal" },
          { label: "Server Uptime", value: fmtUptime(uptime), icon: Clock, color: "text-brand-amber" },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/[0.06] rounded-xl p-4">
            <s.icon size={16} className={`${s.color} mb-2`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Network interfaces */}
      {data?.network && Object.keys(data.network).length > 0 && (
        <div className="glass border border-white/[0.06] rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wifi size={16} className="text-brand-blue" />
            Network Interfaces
          </h3>
          <div className="space-y-3">
            {Object.entries(data.network).map(([name, addrs]) => (
              <div key={name} className="flex items-start gap-3">
                <span className="text-xs font-mono bg-base-700 px-2 py-1 rounded-lg text-white/60 shrink-0">{name}</span>
                <div className="flex flex-wrap gap-2">
                  {(addrs as string[]).map((addr) => (
                    <Badge key={addr} variant="blue">{addr}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection info */}
      <div className="glass border border-white/[0.06] rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity size={16} className="text-brand-blue" />
          Service Endpoints
        </h3>
        <div className="space-y-2 font-mono text-sm">
          {[
            ["WiFi-Media UI",      "http://<your-ip>/"],
            ["API",                "http://<your-ip>/api"],
            ["WebSocket",          "ws://<your-ip>/socket.io"],
            ["TVHeadend",          "http://<your-ip>:9981"],
            ["HLS Stream",         "http://<your-ip>/stream/channel/<uuid>"],
          ].map(([label, url]) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-white/[0.05] last:border-0">
              <span className="text-white/40 w-40 shrink-0 text-xs">{label}</span>
              <span className="text-brand-teal text-xs">{url}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title, icon, status, detail,
}: {
  title: string;
  icon: React.ReactNode;
  status: "online" | "offline" | "unknown";
  detail: string;
}) {
  const colors = {
    online:  { bg: "bg-brand-green/10", border: "border-brand-green/20", text: "text-brand-green" },
    offline: { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400" },
    unknown: { bg: "bg-white/[0.04]",   border: "border-white/[0.08]",   text: "text-white/40" },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass ${colors.border} border rounded-2xl p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`text-white/60`}>{icon}</div>
        {status === "online"
          ? <CheckCircle size={16} className="text-brand-green" />
          : <XCircle size={16} className="text-red-400" />
        }
      </div>
      <p className="font-semibold mb-0.5">{title}</p>
      <p className={`text-xs ${colors.text}`}>{detail}</p>
      <div className={`mt-3 text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
        {status}
      </div>
    </motion.div>
  );
}
