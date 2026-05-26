import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Plus, Play, LogIn, Crown, Clock, X } from "lucide-react";
import { roomApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import ChatPanel from "@/components/Chat/ChatPanel";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

interface Room {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  state: string;
  member_count: number;
  created_at: number;
}

export default function WatchParty() {
  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApi.list().then((r) => r.data),
    refetchInterval: 10_000,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => roomApi.create(name),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      setActiveRoom(res.data.id);
      setShowCreate(false);
      setNewRoomName("");
    },
  });

  const joinMut = useMutation({
    mutationFn: (id: string) => roomApi.join(id),
    onSuccess: (_, id) => {
      setActiveRoom(id);
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const leaveMut = useMutation({
    mutationFn: (id: string) => roomApi.leave(id),
    onSuccess: () => {
      setActiveRoom(null);
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const rooms: Room[] = data?.rooms ?? [];

  const stateColor = (state: string) => {
    if (state === "playing") return "green";
    if (state === "paused") return "amber";
    return "ghost";
  };

  const fmtTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-brand-blue" />
          <h2 className="text-xl font-semibold">Watch Party</h2>
          <Badge variant="teal">{rooms.length} active</Badge>
        </div>
        <div className="flex gap-2">
          <ChatPanel
            roomId={activeRoom ?? undefined}
            isOpen={chatOpen}
            onToggle={() => setChatOpen(!chatOpen)}
          />
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} />
            Create Room
          </button>
        </div>
      </div>

      {/* Create room modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong rounded-2xl p-6 w-full max-w-sm border border-white/[0.1]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Create Watch Room</h3>
              <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Room Name</label>
                <input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Movie Night 🍿"
                  className="input"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && newRoomName.trim() && createMut.mutate(newRoomName)}
                />
              </div>
              <button
                onClick={() => newRoomName.trim() && createMut.mutate(newRoomName)}
                disabled={!newRoomName.trim() || createMut.isPending}
                className="w-full btn-primary"
              >
                {createMut.isPending ? "Creating…" : "Create Room"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rooms list */}
      {isLoading ? (
        <Spinner className="h-64" />
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Users size={40} className="mb-3" />
          <p className="font-medium">No active rooms</p>
          <p className="text-sm mt-1">Create a room to watch with others</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const isHost = room.host_id === user?.id;
            const isInRoom = activeRoom === room.id;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-2xl p-5 border transition-all ${
                  isInRoom ? "border-brand-blue/50 bg-brand-blue/5" : "border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold truncate">{room.name}</p>
                      {isHost && <Crown size={12} className="text-brand-amber shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={stateColor(room.state) as "green" | "amber" | "ghost"}>
                        {room.state}
                      </Badge>
                      <span className="text-xs text-white/30 flex items-center gap-1">
                        <Users size={10} /> {room.member_count}
                      </span>
                    </div>
                  </div>
                  {isInRoom && (
                    <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-white/30 mb-4">
                  <p className="truncate">by {room.host_name}</p>
                  <span>·</span>
                  <Clock size={10} />
                  <span>{fmtTime(room.created_at)}</span>
                </div>

                <div className="flex gap-2">
                  {isInRoom ? (
                    <>
                      <button
                        onClick={() => setChatOpen(true)}
                        className="flex-1 btn-ghost text-xs py-2"
                      >
                        Open Chat
                      </button>
                      <button
                        onClick={() => leaveMut.mutate(room.id)}
                        className="btn-ghost text-xs py-2 text-red-400 hover:text-red-300"
                      >
                        Leave
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => joinMut.mutate(room.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 btn-primary text-xs py-2"
                    >
                      <LogIn size={12} />
                      Join Room
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Chat overlay */}
      {activeRoom && (
        <ChatPanel
          roomId={activeRoom}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        />
      )}
    </div>
  );
}
