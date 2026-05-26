import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, User, Bell, Palette, Globe, Shield, Wifi } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/services/api";
import Badge from "@/components/ui/Badge";

export default function Settings() {
  const { user, refreshMe } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [language, setLanguage] = useState("en");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await authApi.updateProfile({ display_name: displayName, language });
    await refreshMe();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    {
      icon: User, title: "Profile",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Username</label>
            <input value={user?.username ?? ""} disabled className="input opacity-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Role</label>
            <div className="flex items-center gap-2">
              <Badge variant={user?.role === "admin" ? "blue" : "ghost"}>{user?.role}</Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Palette, title: "Appearance",
      content: (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-2 block">Theme</label>
            <div className="flex gap-2">
              {["dark", "darker", "midnight"].map((t) => (
                <button
                  key={t}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${
                    t === "dark"
                      ? "border-brand-blue/40 bg-brand-blue/10 text-brand-blue"
                      : "border-white/[0.06] text-white/40 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Globe, title: "Language",
      content: (
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Display Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input"
          >
            {[["en", "English"], ["vi", "Tiếng Việt"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"]].map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      ),
    },
    {
      icon: Wifi, title: "Network",
      content: (
        <div className="space-y-3 text-sm text-white/50">
          <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
            <span>API Endpoint</span>
            <code className="text-brand-teal text-xs">/api</code>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
            <span>WebSocket</span>
            <Badge variant="green">Connected</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>PWA Mode</span>
            <Badge variant="blue">Offline-ready</Badge>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon size={20} className="text-brand-blue" />
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass border border-white/[0.06] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <section.icon size={15} className="text-brand-blue" />
              <h3 className="font-semibold text-sm">{section.title}</h3>
            </div>
            {section.content}
          </motion.div>
        ))}

        {/* Save button */}
        <div className="flex justify-end">
          <button onClick={handleSave} className="btn-primary">
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
