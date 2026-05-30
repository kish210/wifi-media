import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { initI18n } from "@/i18n";
import Layout from "@/components/Layout/Layout";

// ── Pages ─────────────────────────────────────────────────────────────────
import Landing      from "@/pages/Landing";
import Login        from "@/pages/Login";
import Home         from "@/pages/Home";
import LiveTV       from "@/pages/LiveTV";
import Movies       from "@/pages/Movies";
import WatchParty   from "@/pages/WatchParty";
import Games        from "@/pages/Games";
import NetworkStatus from "@/pages/NetworkStatus";
import Admin        from "@/pages/Admin";
import Settings     from "@/pages/Settings";
import Profile      from "@/pages/Profile";
// New feature pages
import Downloads    from "@/pages/Downloads";
import AppStore     from "@/pages/AppStore";
import AIAssistant  from "@/pages/AIAssistant";
import Broadcast    from "@/pages/Broadcast";
import StorageManager from "@/pages/StorageManager";
import OfflineMap   from "@/pages/OfflineMap";
import JourneyInfo  from "@/pages/JourneyInfo";
import FoodOrder    from "@/pages/FoodOrder";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, refreshMe } = useAuthStore();

  useEffect(() => {
    initI18n();
    if (token) refreshMe();
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/"      element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Protected — inside Layout shell */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Media */}
        <Route path="/home"        element={<Home />} />
        <Route path="/live"        element={<LiveTV />} />
        <Route path="/movies"      element={<Movies />} />
        <Route path="/series"      element={<Movies />} />
        <Route path="/music"       element={<Movies />} />
        {/* Entertainment */}
        <Route path="/games"       element={<Games />} />
        <Route path="/watch-party" element={<WatchParty />} />
        {/* Services */}
        <Route path="/downloads"   element={<Downloads />} />
        <Route path="/appstore"    element={<AppStore />} />
        <Route path="/ai"          element={<AIAssistant />} />
        <Route path="/map"         element={<OfflineMap />} />
        <Route path="/journey"     element={<JourneyInfo />} />
        <Route path="/order"       element={<FoodOrder />} />
        {/* System */}
        <Route path="/broadcast"   element={<Broadcast />} />
        <Route path="/storage"     element={<StorageManager />} />
        <Route path="/network"     element={<NetworkStatus />} />
        <Route path="/settings"    element={<Settings />} />
        <Route path="/admin"       element={<Admin />} />
        <Route path="/profile"     element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
