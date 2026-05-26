import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Users, Film, BarChart3, RefreshCw, Trash2, Crown, Eye } from "lucide-react";
import { adminApi, mediaApi } from "@/services/api";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  role: string;
  created_at: number;
  last_seen: number | null;
}

type Tab = "overview" | "users" | "media";

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/30">
        <Shield size={40} className="mb-3" />
        <p className="font-medium">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Shield size={20} className="text-brand-blue" />
        <h2 className="text-xl font-semibold">Admin Panel</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-base-700 rounded-xl mb-6 w-fit">
        {(["overview", "users", "media"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-brand-blue/20 text-brand-blue" : "text-white/40 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab />}
      {tab === "media" && <MediaTab />}
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats().then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) return <Spinner className="h-40" />;

  const byType = (data?.byType ?? []) as { type: string; c: number }[];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Users",    value: data?.users ?? 0,    icon: Users,   color: "text-brand-blue" },
          { label: "Media",    value: data?.media ?? 0,    icon: Film,    color: "text-brand-purple" },
          { label: "Rooms",    value: data?.rooms ?? 0,    icon: Eye,     color: "text-brand-teal" },
          { label: "Messages", value: data?.messages ?? 0, icon: BarChart3, color: "text-brand-amber" },
        ].map((s) => (
          <div key={s.label} className="glass border border-white/[0.06] rounded-xl p-4">
            <s.icon size={16} className={`${s.color} mb-2`} />
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {byType.length > 0 && (
        <div className="glass border border-white/[0.06] rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Media Breakdown</h3>
          <div className="space-y-3">
            {byType.map((t) => (
              <div key={t.type} className="flex items-center gap-3">
                <span className="text-sm text-white/60 w-20 capitalize">{t.type}</span>
                <div className="flex-1 h-2 bg-base-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.c / (data?.media ?? 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-brand-blue to-brand-purple rounded-full"
                  />
                </div>
                <span className="text-sm font-medium w-10 text-right">{t.c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.users().then((r) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const promoteAdminMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUser(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const users: AdminUser[] = data?.users ?? [];

  if (isLoading) return <Spinner className="h-40" />;

  return (
    <div className="glass border border-white/[0.06] rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.05]">
            {["User", "Role", "Last Seen", "Actions"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs text-white/40 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-xs font-bold">
                    {u.display_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{u.display_name}</p>
                    <p className="text-xs text-white/40">@{u.username}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={u.role === "admin" ? "blue" : "ghost"}>{u.role}</Badge>
              </td>
              <td className="px-4 py-3 text-white/40 text-xs">
                {u.last_seen ? new Date(u.last_seen * 1000).toLocaleDateString() : "Never"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => promoteAdminMut.mutate({ id: u.id, role: u.role === "admin" ? "viewer" : "admin" })}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-brand-amber/20 flex items-center justify-center text-white/40 hover:text-brand-amber transition-colors"
                    title={u.role === "admin" ? "Demote" : "Promote to admin"}
                  >
                    <Crown size={12} />
                  </button>
                  <button
                    onClick={() => confirm(`Delete ${u.username}?`) && deleteMut.mutate(u.id)}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-red-500/20 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MediaTab() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ added: number; total: number } | null>(null);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await mediaApi.scan();
      setScanResult(res.data);
    } catch { /* ignore */ }
    setScanning(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass border border-white/[0.06] rounded-2xl p-5">
        <h3 className="font-semibold mb-2">Media Library Scanner</h3>
        <p className="text-sm text-white/40 mb-4">
          Scan the /media folder for new files and add them to the library.
        </p>
        <button onClick={handleScan} disabled={scanning} className="btn-primary flex items-center gap-2">
          <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
          {scanning ? "Scanning…" : "Scan Now"}
        </button>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 text-brand-green text-sm"
          >
            ✓ Scan complete: {scanResult.added} new files added ({scanResult.total} total)
          </motion.div>
        )}
      </div>

      <div className="glass border border-white/[0.06] rounded-2xl p-5">
        <h3 className="font-semibold mb-2">Media Path</h3>
        <p className="text-sm text-white/40 mb-2">
          Mount your media files to this path inside the container:
        </p>
        <code className="block px-3 py-2 rounded-lg bg-base-700 text-brand-teal text-sm font-mono">
          /media
        </code>
        <p className="text-xs text-white/30 mt-2">
          Supported: MP4, MKV, AVI, MOV, TS, WebM, MP3, FLAC, AAC, OGG
        </p>
      </div>
    </div>
  );
}
