import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  X, SkipBack, SkipForward, Settings
} from "lucide-react";
import { clsx } from "clsx";
import { usePlayerStore } from "@/store/playerStore";
import { mediaApi } from "@/services/api";

export default function VideoPlayerOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isOpen, streamUrl, title, subtitle, source, id,
    isPlaying, isMuted, volume, isFullscreen,
    setPlaying, setVolume, setMuted, setFullscreen,
    setPosition, setDuration, close,
  } = usePlayerStore();

  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(0);
  const [qualityLevels, setQualityLevels] = useState<number[]>([]);
  const [showQuality, setShowQuality] = useState(false);

  // ── Load stream ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    // Clean up previous HLS
    hlsRef.current?.destroy();
    hlsRef.current = null;

    const isHls = streamUrl.includes(".m3u8") || streamUrl.includes("profile=hls");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setQualityLevels(data.levels.map((l) => l.height));
        if (isPlaying) video.play().catch(() => {});
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    } else {
      video.src = streamUrl;
    }

    if (isPlaying) video.play().catch(() => {});

    return () => { hlsRef.current?.destroy(); };
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.play().catch(() => {}) : video.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  // ── Control auto-hide ─────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => { resetHideTimer(); }, []);

  // ── Save progress ─────────────────────────────────────────────────────
  useEffect(() => {
    if (source !== "media" || !id) return;
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        mediaApi.progress(id, Math.floor(videoRef.current.currentTime), Math.floor(videoRef.current.duration || 0));
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [source, id, isPlaying]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.currentTime);
    setPosition(v.currentTime);
    setDur(v.duration || 0);
    setDuration(v.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setProgress(t);
  };

  const skip = (secs: number) => {
    if (videoRef.current) videoRef.current.currentTime += secs;
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const pct = dur > 0 ? (progress / dur) * 100 : 0;

  const containerClass = clsx(
    "z-50 bg-black",
    isFullscreen
      ? "fixed inset-0"
      : "fixed bottom-4 right-4 w-80 h-44 rounded-2xl overflow-hidden shadow-card-lg border border-white/10"
  );

  if (!isOpen || !streamUrl) return null;

  return (
    <div
      className={containerClass}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={() => {
          if (videoRef.current) setDur(videoRef.current.duration);
        }}
        playsInline
      />

      {/* Buffering spinner */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-brand-blue animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.85) 100%)" }}
          >
            {/* Top bar */}
            <div className="flex items-start justify-between p-3">
              <div>
                <p className="font-semibold text-sm leading-tight">{title}</p>
                {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
              </div>
              <div className="flex gap-1">
                {qualityLevels.length > 0 && (
                  <button
                    onClick={() => setShowQuality(!showQuality)}
                    className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <Settings size={13} />
                  </button>
                )}
                <button
                  onClick={() => setFullscreen(!isFullscreen)}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                </button>
                <button
                  onClick={close}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-red-500/60 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Center controls */}
            {isFullscreen && (
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => skip(-10)} className="text-white/80 hover:text-white transition-colors">
                  <SkipBack size={28} />
                </button>
                <button
                  onClick={() => setPlaying(!isPlaying)}
                  className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all hover:scale-105"
                >
                  {isPlaying ? <Pause size={26} /> : <Play size={26} fill="white" />}
                </button>
                <button onClick={() => skip(10)} className="text-white/80 hover:text-white transition-colors">
                  <SkipForward size={28} />
                </button>
              </div>
            )}

            {/* Bottom bar */}
            <div className="px-3 pb-3 space-y-1.5">
              {/* Progress bar */}
              {source === "media" && dur > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 tabular-nums w-10 text-right">{fmt(progress)}</span>
                  <div className="relative flex-1 h-1 group">
                    <input
                      type="range" min={0} max={dur} step={0.5}
                      value={progress} onChange={handleSeek}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-4 -mt-1.5"
                    />
                    <div className="w-full h-full bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-blue to-brand-purple rounded-full transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-white/60 tabular-nums w-10">{fmt(dur)}</span>
                </div>
              )}

              {/* Bottom controls row */}
              <div className="flex items-center gap-2">
                {!isFullscreen && (
                  <button
                    onClick={() => setPlaying(!isPlaying)}
                    className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} fill="white" />}
                  </button>
                )}

                <button onClick={() => setMuted(!isMuted)} className="text-white/70 hover:text-white transition-colors ml-1">
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
                  onChange={(e) => { setMuted(false); setVolume(parseFloat(e.target.value)); }}
                  className="w-16 accent-brand-blue cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
