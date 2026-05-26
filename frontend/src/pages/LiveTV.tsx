import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Filter, Grid, List, Heart, Tv2 } from "lucide-react";
import { channelApi } from "@/services/api";
import { usePlayerStore } from "@/store/playerStore";
import ChannelCard, { type Channel } from "@/components/Cards/ChannelCard";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import ChatPanel from "@/components/Chat/ChatPanel";

export default function LiveTV() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { openChannel } = usePlayerStore();

  const { data: channelsData, isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: () => channelApi.list().then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: tagsData } = useQuery({
    queryKey: ["channel-tags"],
    queryFn: () => channelApi.tags().then((r) => r.data),
  });

  const { data: epgNow } = useQuery({
    queryKey: ["epg-now"],
    queryFn: () => channelApi.epgNow().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: favsData } = useQuery({
    queryKey: ["channel-favorites"],
    queryFn: () => channelApi.favorites().then((r) => r.data),
  });

  const favoriteMut = useMutation({
    mutationFn: ({ uuid, faved }: { uuid: string; faved: boolean }) =>
      faved ? channelApi.removeFavorite(uuid) : channelApi.addFavorite(uuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channel-favorites"] }),
  });

  const epgByChannel = useMemo(() => {
    return (epgNow?.events ?? []).reduce(
      (acc: Record<string, { title: string; stop: number }>, ev: { channelUuid: string; title: string; stop: number }) => {
        if (!acc[ev.channelUuid]) acc[ev.channelUuid] = ev;
        return acc;
      },
      {}
    );
  }, [epgNow]);

  const favorites = new Set<string>(favsData?.favorites ?? []);
  const channels: Channel[] = (channelsData?.channels ?? []).map((ch: Channel) => ({
    ...ch,
    nowPlaying: epgByChannel[ch.uuid] ?? null,
  }));

  const filtered = channels.filter((ch) => {
    if (search && !ch.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTag && !(ch.tags ?? []).includes(activeTag)) return false;
    return true;
  });

  const handlePlay = async (ch: Channel) => {
    setActiveChannelId(ch.uuid);
    try {
      const res = await channelApi.streamUrl(ch.uuid);
      openChannel(ch.uuid, ch.name, res.data.url);
    } catch { /* TVH offline */ }
  };

  if (isLoading) return <Spinner className="h-64" />;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Tv2 size={20} className="text-brand-blue" />
          <h2 className="text-xl font-semibold">Live TV</h2>
          <Badge variant="red">LIVE</Badge>
          <span className="text-sm text-white/40">{channels.length} channels</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels…"
              className="input py-2 pl-8 w-52"
            />
          </div>

          {/* View mode */}
          <div className="flex gap-1 p-1 bg-base-700 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-brand-blue/20 text-brand-blue" : "text-white/40"}`}
            >
              <Grid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-brand-blue/20 text-brand-blue" : "text-white/40"}`}
            >
              <List size={14} />
            </button>
          </div>

          <ChatPanel isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
        </div>
      </div>

      {/* Tag filters */}
      {(tagsData?.tags ?? []).length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
          <button
            onClick={() => setActiveTag(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              !activeTag
                ? "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                : "bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white"
            }`}
          >
            All
          </button>
          {(tagsData?.tags ?? []).map((tag: { key: string; val: string }) => (
            <button
              key={tag.key}
              onClick={() => setActiveTag(activeTag === tag.key ? null : tag.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                activeTag === tag.key
                  ? "bg-brand-blue/20 text-brand-blue border-brand-blue/30"
                  : "bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white"
              }`}
            >
              {tag.val}
            </button>
          ))}
        </div>
      )}

      {/* Channels */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Tv2 size={40} className="mb-3" />
          <p className="font-medium">No channels found</p>
          <p className="text-sm mt-1">
            {channels.length === 0 ? "TVHeadend not connected" : "Try a different search"}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              : "space-y-2"
          }
        >
          {filtered.map((ch) => (
            <ChannelCard
              key={ch.uuid}
              channel={ch}
              active={activeChannelId === ch.uuid}
              favorited={favorites.has(ch.uuid)}
              onClick={handlePlay}
              onFavorite={(c) => favoriteMut.mutate({ uuid: c.uuid, faved: favorites.has(c.uuid) })}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
