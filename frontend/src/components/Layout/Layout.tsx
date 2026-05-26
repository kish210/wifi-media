import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import VideoPlayerOverlay from "@/components/Player/VideoPlayerOverlay";
import { usePlayerStore } from "@/store/playerStore";

const pageTitles: Record<string, string> = {
  "/home": "Home",
  "/live": "Live TV",
  "/movies": "Movies",
  "/series": "Series",
  "/music": "Music",
  "/games": "Games",
  "/watch-party": "Watch Party",
  "/profile": "Profile",
  "/settings": "Settings",
  "/admin": "Admin Panel",
  "/network": "Network Status",
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isPlayerOpen = usePlayerStore((s) => s.isOpen);
  const isFullscreen = usePlayerStore((s) => s.isFullscreen);

  const sidebarWidth = collapsed ? 64 : 220;
  const title = pageTitles[location.pathname] ?? "";

  // Keyboard shortcut: [ to collapse sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "[" && e.altKey) setCollapsed((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isFullscreen) {
    return (
      <>
        <VideoPlayerOverlay />
        <Outlet />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-base-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <Topbar title={title} sidebarWidth={sidebarWidth} />

      <motion.main
        animate={{ marginLeft: sidebarWidth }}
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
          <Outlet />
        </motion.div>
      </motion.main>

      {isPlayerOpen && !isFullscreen && <VideoPlayerOverlay />}
    </div>
  );
}
