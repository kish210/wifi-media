import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Wifi, AlertCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";

export default function Login() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    params.get("register") ? "register" : "login"
  );
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate("/home"); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await api.post("/auth/register", { username, display_name: displayName, password });
        await login(username, password);
      }
      navigate("/home");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user: string, pass: string) => {
    setUsername(user); setPassword(pass);
    setLoading(true);
    try {
      await login(user, pass);
      navigate("/home");
    } catch {
      setError("Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-2" />
          <p className="text-white/40 text-sm">Local Network Entertainment</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-6 border border-white/[0.08]">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-base-700 rounded-xl mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-white/50 mb-1.5 block">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="input"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-xs font-medium text-white/50 mb-1.5 block">Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="input"
                    required={mode === "register"}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-medium text-white/50 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="input pr-10"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{mode === "login" ? "Sign In" : "Create Account"}</>
              )}
            </button>
          </form>

          {/* Quick access */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/30 text-center mb-3">Quick access</p>
            <div className="flex gap-2">
              <button
                onClick={() => quickLogin("admin", "admin")}
                className="flex-1 py-2 rounded-xl bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/20 text-brand-blue text-xs font-medium transition-colors"
              >
                Admin
              </button>
              <button
                onClick={() => quickLogin("guest", "guest")}
                className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/50 text-xs font-medium transition-colors"
              >
                Guest
              </button>
            </div>
          </div>
        </div>

        {/* WiFi status hint */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/25">
          <Wifi size={12} />
          <span>Make sure you're connected to the local Wi-Fi</span>
        </div>
      </div>
    </div>
  );
}
