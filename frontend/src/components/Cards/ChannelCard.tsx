import { motion } from "framer-motion";
import { Play, Heart, Signal } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export interface Channel {
  uuid: string;
  name: string;
  number: number;
  icon_public_url?: string;
  tags?: string[];
  nowPlaying?: { title: string; stop: number } | null;
}

interface Props {
  channel: Channel;
  active?: boolean;
  favorited?: boolean;
  onClick: (ch: Channel) => void;
  onFavorite?: (ch: Channel) => void;
}

export default function ChannelCard({ channel, active, favorited, onClick, onFavorite }: Props) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const now = Math.floor(Date.now() / 1000);
  const remaining = channel.nowPlaying
    ? Math.max(0, channel.nowPlaying.stop - now)
    : null;
  const remainingMin = remaining !== null ? Math.ceil(remaining / 60) : null;

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(channel)}
      data-tv-nav
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(channel)}
      className={clsx(
        "channel-card p-3 cursor-pointer",
        active && "active"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Channel logo */}
        <div className="w-12 h-12 rounded-xl bg-base-700 flex items-center justify-center shrink-0 overflow-hidden">
          {channel.icon_public_url && !imgError ? (
            <img
              src={channel.icon_public_url}
              alt={channel.name}
              className="w-full h-full object-contain p-1"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xl font-bold text-white/30">
              {channel.number}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/30 tabular-nums">{channel.number}</span>
            {active && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-red-400">
                <Signal size={8} className="animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate">{channel.name}</p>
          {channel.nowPlaying && (
            <p className="text-xs text-white/40 truncate">{channel.nowPlaying.title}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(channel); }}
              className={clsx(
                "w-6 h-6 rounded-md flex items-center justify-center transition-colors",
                favorited ? "text-red-400 hover:text-red-300" : "text-white/20 hover:text-white/60"
              )}
            >
              <Heart size={12} className={favorited ? "fill-red-400" : ""} />
            </button>
          )}
          {remainingMin !== null && (
            <span className="text-[10px] text-white/30 tabular-nums">{remainingMin}m</span>
          )}
        </div>
      </div>

      {/* EPG progress bar */}
      {channel.nowPlaying && remaining !== null && (
        <div className="mt-2 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-blue/60 rounded-full"
            style={{ width: `${Math.max(5, 100 - (remaining / 3600) * 100)}%` }}
          />
        </div>
      )}

      {/* Play overlay on hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        className="absolute top-1/2 right-3 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center"
      >
        <Play size={14} fill="white" className="text-white ml-0.5" />
      </motion.div>
    </motion.div>
  );
}
