import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Plus, Star, Clock } from "lucide-react";
import { clsx } from "clsx";

export interface MediaItem {
  id: string;
  title: string;
  year?: number | null;
  poster?: string | null;
  rating?: number | null;
  type: string;
  duration?: number | null;
  genres?: string[];
  progress?: number;
}

interface Props {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onAddWatchlist?: (item: MediaItem) => void;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

const sizeClasses = {
  sm: "w-36",
  md: "w-44",
  lg: "w-56",
};

const aspectClasses = {
  sm: "aspect-[2/3]",
  md: "aspect-[2/3]",
  lg: "aspect-[2/3]",
};

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MediaCard({ item, onClick, onAddWatchlist, size = "md", showProgress }: Props) {
  const [imageError, setImageError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pct = item.progress && item.duration
    ? Math.min(100, (item.progress / item.duration) * 100)
    : null;

  return (
    <motion.div
      className={clsx("relative shrink-0 cursor-pointer group", sizeClasses[size])}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={() => onClick(item)}
      data-tv-nav
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(item)}
    >
      {/* Poster */}
      <div className={clsx("relative rounded-xl overflow-hidden bg-base-700", aspectClasses[size])}>
        {item.poster && !imageError ? (
          <img
            src={item.poster}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-base-700 to-base-600">
            <span className="text-3xl">{typeEmoji(item.type)}</span>
            <span className="text-xs text-white/30 text-center px-2 line-clamp-2">{item.title}</span>
          </div>
        )}

        {/* Hover overlay */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClick(item); }}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-110 transition-transform mb-2"
          >
            <Play size={18} className="text-black fill-black ml-0.5" />
          </button>
          {onAddWatchlist && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddWatchlist(item); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-brand-blue/80 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </motion.div>

        {/* Progress bar */}
        {showProgress && pct !== null && pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-brand-blue rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Rating badge */}
        {item.rating && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur">
            <Star size={9} className="text-brand-amber fill-brand-amber" />
            <span className="text-[10px] font-semibold">{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-2 px-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-1">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.year && <span className="text-xs text-white/40">{item.year}</span>}
          {item.duration && (
            <span className="text-xs text-white/30 flex items-center gap-1">
              <Clock size={9} />
              {fmtDuration(item.duration)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function typeEmoji(type: string) {
  const map: Record<string, string> = {
    movie: "🎬", series: "📺", music: "🎵", video: "🎥",
  };
  return map[type] ?? "🎬";
}
