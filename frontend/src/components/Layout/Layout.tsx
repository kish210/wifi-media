import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import VideoPlayerOverlay from "@/components/Player/VideoPlayerOverlay";
import { usePlayerStore } from "@/store/playerStore";
import { useI18n } from "@/i18n";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [kidsMode, setKidsMode] = useState(false);
  const location = useLocation();
  const isPlayerOpen = usePlayerStore((s) => s.isOpen);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);
  const { t, dir } = useI18n();

  const sidebarWidth = collapsed ? 64 : 220;

  const pageTitles: Record<string, string> = {
    "/home": t("home"), "/live": t("live_tv"), "/movies": t("movies"),
    "/series": t("series"), "/music": t("music"), "/games": t("games"),
    "/watch-party": t("watch_party"), "/profile": t("profile"),
    "/settings": t("settings"), "/admin": t("admin"), "/network": t("network"),
    "/downloads": t("downloads"), "/appstore": t("appstore"),
    "/ai": t("ai_assistant"), "/map": t("map_title"),
    "/journey": t("journey_title"), "/order": t("order_title"),
    "/broadcast": t("broadcast"), "/storage": t("storage_nav"),
  };
  const title = pageTitles[location.pathname] ?? "";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "[" && e.altKey) setCollapsed((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Apply RTL to main layout
  useEffect(() => {
    document.documentElement.dir = dir;
  }, [dir]);

  if (isFullscreen) {
    return (<><VideoPlayerOverlay /><Outlet /></>);
  }

  return (
    <div className="min-h-screen bg-base-900" data-kids={kidsMode ? "1" : "0"}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        kidsMode={kidsMode}
        onToggleKids={() => setKidsMode((v) => !v)}
      />

      <Topbar title={title} sidebarWidth={sidebarWidth} kidsMode={kidsMode} />

      <motion.main
        animate={{ marginLeft: dir === "rtl" ? 0 : sidebarWidth, marginRight: dir === "rtl" ? sidebarWidth : 0 }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
        className="pt-14 min-h-screen"
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-6"
        >
          <Outlet context={{ kidsMode }} />
        </motion.div>
      </motion.main>

      {isPlayerOpen && !isFullscreen && <VideoPlayerOverlay />}
    </div>
  );
}
