import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Tv, Film, Music, Gamepad2, Users, Settings,
  Shield, Wifi, LogOut, ChevronRight, Radio
} from "lucide-react";
import { clsx } from "clsx";
import Logo from "@/components/ui/Logo";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: "/home",    icon: Home,      label: "Home" },
  { to: "/live",    icon: Tv,        label: "Live TV", badge: "LIVE" },
  { to: "/movies",  icon: Film,      label: "Movies" },
  { to: "/series",  icon: Radio,     label: "Series" },
  { to: "/music",   icon: Music,     label: "Music" },
  { to: "/games",   icon: Gamepad2,  label: "Games" },
  { to: "/watch-party", icon: Users, label: "Watch Party" },
];

const bottomItems: NavItem[] = [
  { to: "/network", icon: Wifi,      label: "Network" },
  { to: "/settings",icon: Settings,  label: "Settings" },
  { to: "/admin",   icon: Shield,    label: "Admin", adminOnly: true },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
            <item.icon size={18} className="relative shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="relative text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {!collapsed && item.badge && (
              <span className="ml-auto relative text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-base-800 border-r border-white/[0.05] py-4"
    >
      {/* Logo */}
      <div className="px-3 mb-6">
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center mx-auto">
            <Wifi size={18} className="text-white" />
          </div>
        ) : (
          <Logo size="sm" />
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(renderItem)}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-2 h-px bg-white/[0.05]" />

      {/* Bottom nav */}
      <div className="px-2 space-y-0.5">
        {bottomItems.map(renderItem)}
      </div>

      {/* User + collapse */}
      <div className="mt-3 px-2 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-xs font-bold shrink-0">
            {user?.display_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user?.display_name}</p>
              <p className="text-[10px] text-white/40 capitalize">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors">
              <LogOut size={14} />
            </button>
          )}
        </div>

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
