import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, X } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "@/store/authStore";
import { getSocket } from "@/services/socket";

interface Message {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  sentAt: number;
  type?: string;
}

interface Props {
  roomId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatPanel({ roomId, isOpen, onToggle }: Props) {
  const { user, token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socketRef.current = socket;

    if (roomId) socket.emit("room:join", roomId);

    const onMsg = (msg: Message) => setMessages((prev) => [...prev.slice(-199), msg]);
    const onGlobal = (msg: Message) => !roomId && setMessages((prev) => [...prev.slice(-199), msg]);
    const onOnline = ({ count }: { count: number }) => setOnlineCount(count);

    socket.on("chat:message", onMsg);
    socket.on("chat:global", onGlobal);
    socket.on("users:online", onOnline);

    return () => {
      socket.off("chat:message", onMsg);
      socket.off("chat:global", onGlobal);
      socket.off("users:online", onOnline);
      if (roomId) socket.emit("room:leave", roomId);
    };
  }, [token, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("chat:message", { roomId, content: input.trim() });
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="relative w-10 h-10 rounded-xl glass border border-white/[0.08] flex items-center justify-center hover:border-brand-blue/40 transition-colors"
      >
        <MessageCircle size={16} className="text-white/60" />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-blue text-[9px] font-bold flex items-center justify-center">
            {Math.min(99, messages.length)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
            className="fixed right-0 top-14 bottom-0 w-80 z-30 flex flex-col bg-base-800 border-l border-white/[0.05]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
              <div>
                <p className="text-sm font-semibold">
                  {roomId ? "Room Chat" : "Global Chat"}
                </p>
                <p className="text-xs text-white/40">
                  {onlineCount} online
                </p>
              </div>
              <button onClick={onToggle} className="text-white/30 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-white/20">
                  <MessageCircle size={32} />
                  <p className="text-sm mt-2">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.userId === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx("flex gap-2", isMe && "flex-row-reverse")}
                  >
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {msg.displayName[0]?.toUpperCase()}
                    </div>
                    <div className={clsx("max-w-[75%]", isMe && "items-end")}>
                      <div className={clsx(
                        "flex items-baseline gap-1 mb-0.5",
                        isMe && "flex-row-reverse"
                      )}>
                        <span className="text-[10px] font-semibold text-white/60">{msg.displayName}</span>
                        <span className="text-[9px] text-white/25">{formatTime(msg.sentAt)}</span>
                      </div>
                      <div className={clsx(
                        "px-3 py-1.5 rounded-2xl text-sm",
                        isMe
                          ? "bg-brand-blue/30 rounded-tr-sm"
                          : "bg-white/[0.07] rounded-tl-sm"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.05]">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Send a message…"
                  maxLength={500}
                  className="input text-sm py-2 flex-1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl bg-brand-blue/80 hover:bg-brand-blue disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
