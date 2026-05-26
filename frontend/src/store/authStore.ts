import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/services/api";

interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  avatar: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post("/auth/login", { username, password });
          api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await api.post("/auth/logout"); } catch { /* ignore */ }
        delete api.defaults.headers.common["Authorization"];
        set({ user: null, token: null });
      },

      refreshMe: async () => {
        try {
          const { data } = await api.get("/auth/me");
          set({ user: data });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: "wifi-media-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
