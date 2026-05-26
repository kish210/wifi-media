import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Clock, Heart, BookMarked, LogOut, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { mediaApi } from "@/services/api";
import MediaCard, { type MediaItem } from "@/components/Cards/MediaCard";
import { usePlayerStore } from "@/store/playerStore";

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { openMedia } = usePlayerStore();

  const { data: historyData } = useQuery({
    queryKey: ["history"],
    queryFn: () => mediaApi.history().then((r) => r.data),
  });

  const { data: watchlistData } = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => mediaApi.watchlist().then((r) => r.data),
  });

  const history = historyData?.items ?? [];
  const watchlist = watchlistData?.items ?? [];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handlePlay = (item: MediaItem) => {
    openMedia(item.id, item.title, mediaApi.streamUrl(item.id));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass border border-white/[0.06] rounded-3xl p-6 mb-8"
      >
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-3xl font-bold">
            {user?.display_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user?.display_name}</h2>
            <p className="text-white/50 text-sm">@{user?.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user?.role === "admin" ? "bg-brand-blue/20 text-brand-blue" : "bg-white/[0.06] text-white/50"
              }`}>
                {user?.role}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/settings")} className="btn-ghost text-sm">
              Settings
            </button>
            <button onClick={handleLogout} className="btn-danger text-sm flex items-center gap-1.5">
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/[0.05]">
          {[
            { label: "Watched",    value: history.length,   icon: Clock },
            { label: "Watchlist",  value: watchlist.length, icon: BookMarked },
            { label: "Favorites",  value: "—",              icon: Heart },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <s.icon size={14} className="text-brand-blue mx-auto mb-1" />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Watch history */}
      {history.length > 0 && (
        <section className="mb-8">
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <Clock size={15} className="text-white/50" />
            Continue Watching
          </h3>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {history.slice(0, 10).map((item: MediaItem & { progress: number }) => (
              <MediaCard key={item.id} item={item} onClick={handlePlay} showProgress size="md" />
            ))}
          </div>
        </section>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 font-semibold mb-4">
            <BookMarked size={15} className="text-white/50" />
            My Watchlist
          </h3>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {watchlist.slice(0, 12).map((item: MediaItem) => (
              <MediaCard key={item.id} item={item} onClick={handlePlay} size="md" />
            ))}
          </div>
        </section>
      )}

      {history.length === 0 && watchlist.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <User size={40} className="mb-3" />
          <p className="font-medium">Nothing here yet</p>
          <p className="text-sm mt-1">Start watching to see your history</p>
        </div>
      )}
    </div>
  );
}
