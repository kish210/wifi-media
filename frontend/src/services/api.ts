import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  withCredentials: true,
});

// Intercept 401 → clear local auth
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Let calling component handle it
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Channel helpers ────────────────────────────────────────────────────────
export const channelApi = {
  list: () => api.get("/channels"),
  epgNow: () => api.get("/channels/epg/now"),
  epg: (uuid: string) => api.get(`/channels/${uuid}/epg`),
  streamUrl: (uuid: string) => api.get(`/channels/${uuid}/stream`),
  hlsUrl: (uuid: string) => api.get(`/channels/${uuid}/stream?profile=hls`),
  favorites: () => api.get("/channels/favorites"),
  addFavorite: (uuid: string) => api.post(`/channels/${uuid}/favorite`),
  removeFavorite: (uuid: string) => api.delete(`/channels/${uuid}/favorite`),
  tags: () => api.get("/channels/tags"),
};

// ── Media helpers ──────────────────────────────────────────────────────────
export const mediaApi = {
  list: (params?: Record<string, string | number>) => api.get("/media", { params }),
  get: (id: string) => api.get(`/media/${id}`),
  streamUrl: (id: string) => `/api/media/stream/${id}`,
  progress: (id: string, progress: number, duration: number) =>
    api.post(`/media/${id}/progress`, { progress, duration }),
  watchlist: () => api.get("/media/watchlist/all"),
  addWatchlist: (id: string) => api.post(`/media/${id}/watchlist`),
  history: () => api.get("/media/history/recent"),
  scan: () => api.post("/media/scan"),
};

// ── Room helpers ───────────────────────────────────────────────────────────
export const roomApi = {
  list: () => api.get("/rooms"),
  get: (id: string) => api.get(`/rooms/${id}`),
  create: (name: string, mediaId?: string, mediaType?: string) =>
    api.post("/rooms", { name, media_id: mediaId, media_type: mediaType }),
  join: (id: string) => api.post(`/rooms/${id}/join`),
  leave: (id: string) => api.delete(`/rooms/${id}/leave`),
  messages: (id: string) => api.get(`/rooms/${id}/messages`),
  close: (id: string) => api.post(`/rooms/${id}/close`),
};

// ── Auth helpers ───────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) => api.post("/auth/login", { username, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  register: (body: { username: string; display_name: string; password: string }) =>
    api.post("/auth/register", body),
  updateProfile: (body: { display_name?: string; avatar?: string; language?: string; theme?: string }) =>
    api.patch("/auth/me", body),
};

// ── Network ────────────────────────────────────────────────────────────────
export const networkApi = {
  status: () => api.get("/network/status"),
};

// ── Admin ──────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get("/admin/stats"),
  users: () => api.get("/admin/users"),
  updateUser: (id: string, body: object) => api.patch(`/admin/users/${id}`, body),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  scanMedia: () => api.post("/admin/media/scan"),
};
