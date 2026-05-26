import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Film, X } from "lucide-react";
import { mediaApi } from "@/services/api";
import { usePlayerStore } from "@/store/playerStore";
import MediaCard, { type MediaItem } from "@/components/Cards/MediaCard";
import Spinner from "@/components/ui/Spinner";

const TYPES: { key: string; label: string; emoji: string }[] = [
  { key: "movie",  label: "Movies",  emoji: "🎬" },
  { key: "series", label: "Series",  emoji: "📺" },
  { key: "music",  label: "Music",   emoji: "🎵" },
  { key: "video",  label: "Videos",  emoji: "🎥" },
];

const PAGE_SIZE = 48;

export default function Movies() {
  const [urlParams] = useSearchParams();
  const [search, setSearch] = useState(urlParams.get("search") ?? "");
  const [type, setType] = useState("movie");
  const [page, setPage] = useState(0);
  const qc = useQueryClient();
  const { openMedia } = usePlayerStore();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["media", type, search, page],
    queryFn: () =>
      mediaApi.list({
        type,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }).then((r) => r.data),
  });

  const watchlistMut = useMutation({
    mutationFn: (id: string) => mediaApi.addWatchlist(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  const items: MediaItem[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

  const handlePlay = (item: MediaItem) => {
    openMedia(item.id, item.title, mediaApi.streamUrl(item.id), item.type);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Film size={20} className="text-brand-blue" />
          <h2 className="text-xl font-semibold">Library</h2>
          <span className="text-sm text-white/40">{total} items</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search library…"
              className="input py-2 pl-8 w-52"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setType(t.key); setPage(0); }}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              type === t.key
                ? "bg-brand-blue/15 text-brand-blue border-brand-blue/30"
                : "bg-white/[0.04] text-white/50 border-white/[0.06] hover:text-white"
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <Spinner className="h-64" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <span className="text-5xl mb-4">{TYPES.find((t) => t.key === type)?.emoji}</span>
          <p className="font-medium">No {type}s found</p>
          {search && <p className="text-sm mt-1">Try clearing the search</p>}
          {!search && <p className="text-sm mt-1">Add media files to the /media folder</p>}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isFetching ? 0.5 : 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <MediaCard
                    item={item}
                    onClick={handlePlay}
                    onAddWatchlist={() => watchlistMut.mutate(item.id)}
                    size="md"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost disabled:opacity-30"
              >
                Previous
              </button>
              <span className="flex items-center px-4 text-sm text-white/50">
                {page + 1} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="btn-ghost disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
