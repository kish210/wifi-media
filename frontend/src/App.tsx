import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import Layout from "@/components/Layout/Layout";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import LiveTV from "@/pages/LiveTV";
import Movies from "@/pages/Movies";
import WatchParty from "@/pages/WatchParty";
import Games from "@/pages/Games";
import NetworkStatus from "@/pages/NetworkStatus";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, refreshMe } = useAuthStore();

  useEffect(() => {
    if (token) refreshMe();
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* Protected — inside Layout shell */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/home"        element={<Home />} />
        <Route path="/live"        element={<LiveTV />} />
        <Route path="/movies"      element={<Movies />} />
        <Route path="/series"      element={<Movies />} />
        <Route path="/music"       element={<Movies />} />
        <Route path="/games"       element={<Games />} />
        <Route path="/watch-party" element={<WatchParty />} />
        <Route path="/network"     element={<NetworkStatus />} />
        <Route path="/admin"       element={<Admin />} />
        <Route path="/settings"    element={<Settings />} />
        <Route path="/profile"     element={<Profile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
