import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Tv, Film, Music, Gamepad2, Users, Settings,
  Shield, Wifi, LogOut, ChevronRight, Radio,
  Download, ShoppingBag, Bot, Map, Navigation, ShoppingCart,
  Phone, Database, Baby,
} from "lucide-react";
import { clsx } from "clsx";
import Logo from "@/components/ui/Logo";
import { useAuthStore } from "@/store/authStore";
import { useI18n } from "@/i18n";

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

const mediaItems: NavItem[] = [
  { to: "/home",        icon: Home,      labelKey: "home" },
  { to: "/live",        icon: Tv,        labelKey: "live_tv",    badge: "LIVE", badgeColor: "bg-red-500" },
  { to: "/movies",      icon: Film,      labelKey: "movies" },
  { to: "/series",      icon: Radio,     labelKey: "series" },
  { to: "/music",       icon: Music,     labelKey: "music" },
  { to: "/games",       icon: Gamepad2,  labelKey: "games" },
  { to: "/watch-party", icon: Users,     labelKey: "watch_party" },
];

const serviceItems: NavItem[] = [
  { to: "/downloads",   icon: Download,      labelKey: "downloads",    badge: "3",   badgeColor: "bg-blue-500/80" },
  { to: "/appstore",    icon: ShoppingBag,   labelKey: "appstore",     badge: "NEW", badgeColor: "bg-green-500/80" },
  { to: "/ai",          icon: Bot,           labelKey: "ai_assistant", badge: "AI",  badgeColor: "bg-purple-500/80" },
  { to: "/map",         icon: Map,           labelKey: "map_nav",      badge: "OSM", badgeColor: "bg-emerald-500/80" },
  { to: "/journey",     icon: Navigation,    labelKey: "journey_nav" },
  { to: "/order",       icon: ShoppingCart,  labelKey: "order_nav" },
];

const systemItems: NavItem[] = [
  { to: "/broadcast",   icon: Phone,     labelKey: "broadcast",   adminOnly: true },
  { to: "/storage",     icon: Database,  labelKey: "storage_nav", adminOnly: true },
  { to: "/network",     icon: Wifi,      labelKey: "network" },
  { to: "/settings",    icon: Settings,  labelKey: "settings" },
  { to: "/admin",       icon: Shield,    labelKey: "admin",       adminOnly: true },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  kidsMode: boolean;
  onToggleKids: () => void;
}

export default function Sidebar({ collapsed, onToggle, kidsMode, onToggleKids }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const renderItem = (item: NavItem) => {
    if (item.adminOnly && user?.role !== "admin") return null;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        data-tv-nav
        className={({ isActive }) => clsx(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 outline-none",
          isActive
            ? "bg-brand-blue/15 text-brand-blue"
            : "text-white/50 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-brand-blue/10 border border-brand-blue/20"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <item.icon size={17} className="relative shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="relative text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {t(item.labelKey)}
                </motion.span>
              )}
            </AnimatePresence>
            {!collapsed && item.badge && (
              <span className={clsx("ml-auto relative text-[9px] font-bold px-1.5 py-0.5 rounded text-white", item.badgeColor ?? "bg-white/20")}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const groupLabel = (key: string) =>
    !collapsed ? (
      <p className="px-3 pt-3 pb-1 text-[9px] font-bold tracking-widest uppercase text-white/20">
        {t(key)}
      </p>
    ) : <div className="my-1 mx-2 h-px bg-white/[0.05]" />;

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-base-800 border-r border-white/[0.05] py-4"
    >
      {/* Logo */}
      <div className="px-3 mb-4">
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center mx-auto">
            <Wifi size={18} className="text-white" />
          </div>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 overflow-y-auto scrollbar-hide space-y-0.5">
        {/* Media group */}
        {mediaItems.map(renderItem)}

        {/* Services group */}
        {groupLabel("nav_services")}
        {serviceItems.map(renderItem)}

        {/* System group */}
        {groupLabel("nav_system")}
        {systemItems.map(renderItem)}
      </nav>

      {/* Kids mode */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <button
            onClick={onToggleKids}
            className={clsx(
              "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              kidsMode
                ? "bg-amber-400/15 border border-amber-400/30 text-amber-300"
                : "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70"
            )}
          >
            <Baby size={15} />
            <span>{kidsMode ? t("kids_on") : t("kids_off")}</span>
          </button>
        </div>
      )}

      {/* Language switcher */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            {(["en", "fa", "ar"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                  lang === l
                    ? "bg-brand-purple/20 text-brand-purple"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {l === "en" ? "EN" : l === "fa" ? "فا" : "عر"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User card */}
      <div className="px-2 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-xs font-bold shrink-0">
            {user?.display_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user?.display_name}</p>
                <p className="text-[10px] text-white/40 capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors">
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>

        {/* Sama brand */}
        {!collapsed && (
          <a
            href="https://kishwifi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-950/30 border border-blue-500/15 hover:border-blue-500/35 transition-all"
          >
            <svg width="20" height="18" viewBox="0 0 44 40" fill="none" className="shrink-0">
              <path d="M35 30H11a8 8 0 1 1 1.6-15.84A10 10 0 0 1 35 21a6 6 0 0 1 0 9z" fill="#1a3a6e" stroke="#3b7dd8" strokeWidth="1.4"/>
              <path d="M17.5 24.5a6.5 6.5 0 0 1 9 0" stroke="#90bfff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="22" cy="28" r="1.8" fill="#90bfff"/>
            </svg>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold text-white/75 leading-none" dir="rtl">سماع رایانه کیش</p>
              <p className="text-[9px] text-amber-400/60 mt-0.5 tracking-wide">kishwifi.com</p>
            </div>
          </a>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
            <ChevronRight size={16} />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  );
}
