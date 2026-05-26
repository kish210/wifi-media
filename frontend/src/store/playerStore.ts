import { create } from "zustand";

export type PlayerSource = "channel" | "media";

interface PlayerState {
  isOpen: boolean;
  source: PlayerSource | null;
  id: string | null;       // channelUuid or mediaId
  title: string;
  subtitle: string;
  streamUrl: string | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  position: number;
  duration: number;
  isFullscreen: boolean;
  roomId: string | null;

  openChannel: (uuid: string, name: string, streamUrl: string) => void;
  openMedia: (id: string, title: string, streamUrl: string, subtitle?: string) => void;
  close: () => void;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setPosition: (v: number) => void;
  setDuration: (v: number) => void;
  setFullscreen: (v: boolean) => void;
  setRoomId: (id: string | null) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  isOpen: false,
  source: null,
  id: null,
  title: "",
  subtitle: "",
  streamUrl: null,
  isPlaying: false,
  isMuted: false,
  volume: 0.8,
  position: 0,
  duration: 0,
  isFullscreen: false,
  roomId: null,

  openChannel: (uuid, name, streamUrl) =>
    set({ isOpen: true, source: "channel", id: uuid, title: name, subtitle: "Live", streamUrl, isPlaying: true }),

  openMedia: (id, title, streamUrl, subtitle = "") =>
    set({ isOpen: true, source: "media", id, title, subtitle, streamUrl, isPlaying: true }),

  close: () => set({ isOpen: false, source: null, id: null, streamUrl: null, isPlaying: false }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setMuted: (v) => set({ isMuted: v }),
  setPosition: (v) => set({ position: v }),
  setDuration: (v) => set({ duration: v }),
  setFullscreen: (v) => set({ isFullscreen: v }),
  setRoomId: (id) => set({ roomId: id }),
}));
