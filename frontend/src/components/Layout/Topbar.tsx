import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Wifi, WifiOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { networkApi } from "@/services/api";

interface Props {
  title?: string;
  sidebarWidth: number;
}

export default function Topbar({ title, sidebarWidth }: Props) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: netStatus } = useQuery({
    queryKey: ["network-status"],
    queryFn: () => networkApi.status().then((r) => r.data),
    refetchInterval: 30_000,
    retry: false,
  });

  const tvhOnline = netStatus?.tvheadend?.online;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/movies?search=${encodeURIComponent(search)}`);
      setSearchOpen(false);
      setSearch("");
    }
  };

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-white/[0.05] bg-base-900/80 backdrop-blur-md"
      style={{ left: sidebarWidth }}
    >
      {/* Page title */}
      {title && (
        <h1 className="text-base font-semibold text-white/80 mr-auto">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <AnimatePresence>
          {searchOpen ? (
            <motion.form
              key="search-open"
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              onSubmit={handleSearch}
              className="flex items-center"
            >
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search movies, shows, music…"
                className="input py-1.5 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-3 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </motion.form>
          ) : (
            <motion.button
              key="search-closed"
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <Search size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* TVHeadend status indicator */}
        <div className={clsx(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium",
          tvhOnline === undefined ? "text-white/30 bg-white/[0.04]" :
          tvhOnline ? "text-brand-green bg-brand-green/10" : "text-red-400 bg-red-500/10"
        )}>
          {tvhOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden sm:inline">
            {tvhOnline === undefined ? "—" : tvhOnline ? "TVH" : "Offline"}
          </span>
        </div>

        {/* Online users */}
        {netStatus?.stats && (
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/40 bg-white/[0.04]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            <span>{netStatus.stats.users} users</span>
          </div>
        )}

        {/* Avatar */}
        <button
          onClick={() => navigate("/profile")}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-xs font-bold hover:scale-105 transition-transform"
        >
          {user?.display_name?.[0]?.toUpperCase() ?? "?"}
        </button>
      </div>
    </header>
  );
}
