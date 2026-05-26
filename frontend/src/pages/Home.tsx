import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Tv, Film, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { channelApi, mediaApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { usePlayerStore } from "@/store/playerStore";
import MediaCard, { type MediaItem } from "@/components/Cards/MediaCard";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

const heroGradients = [
  "from-blue-900/80 via-purple-900/50",
  "from-purple-900/80 via-pink-900/50",
  "from-teal-900/80 via-blue-900/50",
];

export default function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { openMedia, openChannel } = usePlayerStore();

  const { data: channelsData } = useQuery({
    queryKey: ["channels"],
    queryFn: () => channelApi.list().then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: epgNow } = useQuery({
    queryKey: ["epg-now"],
    queryFn: () => channelApi.epgNow().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: moviesData } = useQuery({
    queryKey: ["movies-home"],
    queryFn: () => mediaApi.list({ type: "movie", limit: 12 }).then((r) => r.data),
  });

  const { data: historyData } = useQuery({
    queryKey: ["history"],
    queryFn: () => mediaApi.history().then((r) => r.data),
  });

  const channels = channelsData?.channels ?? [];
  const movies = moviesData?.items ?? [];
  const history = historyData?.items ?? [];

  const epgByChannel = (epgNow?.events ?? []).reduce(
    (acc: Record<string, typeof epgNow.events[0]>, ev: typeof epgNow.events[0]) => {
      if (!acc[ev.channelUuid]) acc[ev.channelUuid] = ev;
      return acc;
    },
    {}
  );

  const liveChannels = channels.slice(0, 5).map((ch: { uuid: string }) => ({
    ...ch,
    nowPlaying: epgByChannel[ch.uuid] ?? null,
  }));

  const handlePlayChannel = async (ch: { uuid: string; name: string }) => {
    try {
      const res = await channelApi.streamUrl(ch.uuid);
      openChannel(ch.uuid, ch.name, res.data.url);
    } catch { /* TVH offline */ }
  };

  const handlePlayMedia = (item: MediaItem) => {
    openMedia(item.id, item.title, mediaApi.streamUrl(item.id), item.type);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl h-48 md:h-64"
        style={{ background: "linear-gradient(135deg, #0d1b3e 0%, #1a0d3e 50%, #0d2b3e 100%)" }}
      >
        {/* Animated orbs */}
        <div className="absolute top-4 right-8 w-48 h-48 bg-brand-blue/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 right-40 w-64 h-64 bg-brand-purple/15 rounded-full blur-3xl" />

        <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-8">
          <p className="text-white/50 text-sm mb-1">{greeting},</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            {user?.display_name ?? "Welcome back"} 👋
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/live")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-sm font-medium transition-colors border border-white/10"
            >
              <Tv size={14} />
              Watch Live TV
            </button>
            <button
              onClick={() => navigate("/movies")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue/80 hover:bg-brand-blue text-sm font-medium transition-colors"
            >
              <Film size={14} />
              Browse Movies
            </button>
          </div>
        </div>
      </motion.div>

      {/* Continue watching */}
      {history.length > 0 && (
        <Section
          title="Continue Watching"
          icon={<Clock size={16} />}
          onSeeAll={() => navigate("/movies")}
        >
          <HorizontalScroll>
            {history.map((item: MediaItem & { progress: number }) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={handlePlayMedia}
                showProgress
              />
            ))}
          </HorizontalScroll>
        </Section>
      )}

      {/* Live now */}
      {liveChannels.length > 0 && (
        <Section
          title="Live Now"
          icon={<span className="flex items-center gap-1 text-red-400 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE</span>}
          onSeeAll={() => navigate("/live")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {liveChannels.map((ch: { uuid: string; name: string; number: number; nowPlaying?: { title: string } | null }) => (
              <motion.button
                key={ch.uuid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePlayChannel(ch)}
                className="channel-card p-4 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-base-600 flex items-center justify-center mb-2 text-sm font-bold text-white/50">
                  {ch.number}
                </div>
                <p className="font-semibold text-sm">{ch.name}</p>
                {ch.nowPlaying && (
                  <p className="text-xs text-white/40 mt-0.5 truncate">{ch.nowPlaying.title}</p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <Play size={10} className="text-brand-blue" fill="currentColor" />
                  <span className="text-[10px] text-brand-blue font-medium">Watch live</span>
                </div>
              </motion.button>
            ))}
          </div>
        </Section>
      )}

      {/* Movies */}
      {movies.length > 0 && (
        <Section
          title="Movies"
          icon={<Film size={16} />}
          onSeeAll={() => navigate("/movies")}
        >
          <HorizontalScroll>
            {movies.map((item: MediaItem) => (
              <MediaCard key={item.id} item={item} onClick={handlePlayMedia} onAddWatchlist={() => {}} />
            ))}
          </HorizontalScroll>
        </Section>
      )}

      {/* Empty state */}
      {channels.length === 0 && movies.length === 0 && (
        <EmptyState />
      )}
    </div>
  );
}

function Section({
  title, icon, children, onSeeAll,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSeeAll?: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-white/60">{icon}</span>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors"
          >
            See all <ChevronRight size={14} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-base-700 flex items-center justify-center mb-4">
        <TrendingUp size={32} className="text-white/20" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nothing here yet</h3>
      <p className="text-white/40 text-sm max-w-sm mb-6">
        Connect TVHeadend for live TV, or add media files to the media folder to get started.
      </p>
      <Badge variant="blue">Setup guide in Admin Panel</Badge>
    </div>
  );
}
