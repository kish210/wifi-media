import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Download, CheckCircle, XCircle, Settings,
  Cpu, Sparkles, ChevronRight, AlertCircle,
} from "lucide-react";
import api from "@/services/api";
import Spinner from "@/components/ui/Spinner";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AIStatus {
  loaded: boolean;
  model_name: string | null;
  model_size: string | null;
  offline: boolean;
}

interface AIModel {
  id: string;
  name: string;
  size: string;
  description: string;
  downloaded: boolean;
  active: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "What's on the schedule today?",
  "Tell me about the destination",
  "Recommend a movie to watch",
  "What's the weather like?",
];

const CAPABILITIES = [
  "Answer general questions",
  "Recommend content",
  "Journey & travel info",
  "Language translation",
  "Entertainment suggestions",
];

function uid(): string {
  return Math.random().toString(36).slice(2);
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center shrink-0">
        <Bot size={12} />
      </div>
      <div className="glass border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content: "Hi! I'm your onboard AI assistant. I can help with travel info, content recommendations, translations, and more. How can I help?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: statusData } = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => api.get("/ai/status").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: modelsData } = useQuery({
    queryKey: ["ai-models"],
    queryFn: () => api.get("/ai/models").then((r) => r.data),
    staleTime: 60_000,
  });

  const downloadModelMut = useMutation({
    mutationFn: (modelId: string) => api.post(`/ai/models/${modelId}/download`),
  });

  const activateModelMut = useMutation({
    mutationFn: (modelId: string) => api.post(`/ai/models/${modelId}/activate`),
  });

  const status: AIStatus = statusData ?? { loaded: false, model_name: null, model_size: null, offline: true };
  const models: AIModel[] = modelsData?.models ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const userMsg: Message = { id: uid(), role: "user", content: content.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Attempt streaming; fall back to non-streaming response
      const res = await api.post(
        "/ai/chat",
        { message: content.trim(), history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })) },
        { responseType: "text" }
      );

      const aiMsg: Message = {
        id: uid(),
        role: "assistant",
        content: typeof res.data === "string" ? res.data : res.data?.reply ?? "I couldn't process that. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please check that an AI model is loaded.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-10rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
            <Bot size={16} />
          </div>
          <h2 className="text-xl font-semibold">AI Assistant</h2>
        </div>

        {/* Status badge */}
        <div className={clsx(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
          status.loaded
            ? "bg-brand-teal/10 border-brand-teal/20 text-brand-teal"
            : "bg-white/[0.04] border-white/[0.06] text-white/40"
        )}>
          {status.loaded ? (
            <><CheckCircle size={10} /> Model Loaded {status.offline ? "· Offline" : ""}</>
          ) : (
            <><XCircle size={10} /> No Model</>
          )}
        </div>

        {/* Model info */}
        {status.model_name && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Cpu size={12} />
            <span>{status.model_name}</span>
            {status.model_size && <span>({status.model_size})</span>}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Model info bar */}
          <div className="glass border border-white/[0.06] rounded-2xl px-4 py-2.5 mb-3 flex items-center gap-3 shrink-0">
            <Cpu size={14} className="text-brand-blue shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{status.model_name ?? "No model loaded"}</p>
              {status.model_size && <p className="text-xs text-white/30">{status.model_size}</p>}
            </div>
            <button
              onClick={() => setShowModelPicker((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white transition-colors"
            >
              <Settings size={12} />
              Change Model
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx("flex items-end gap-2 mb-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center shrink-0">
                      <Bot size={12} />
                    </div>
                  )}
                  <div className={clsx(
                    "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-brand-blue/20 border border-brand-blue/20 rounded-br-sm text-white"
                      : "glass border border-white/[0.06] rounded-bl-sm text-white/90"
                  )}>
                    {msg.content}
                    <p className="text-[10px] text-white/20 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 shrink-0">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={isTyping}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 mt-2 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={status.loaded ? "Type a message… (Enter to send)" : "Load a model first…"}
              disabled={!status.loaded || isTyping}
              rows={1}
              className="flex-1 input resize-none py-3 max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping || !status.loaded}
              className="px-4 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto scrollbar-hide">
          {/* Capabilities */}
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-brand-purple" />
              Capabilities
            </h3>
            <ul className="space-y-2">
              {CAPABILITIES.map((cap) => (
                <li key={cap} className="flex items-center gap-2 text-xs text-white/60">
                  <CheckCircle size={12} className="text-brand-teal shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          </div>

          {/* Available models */}
          <div className="glass border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Cpu size={14} className="text-brand-blue" />
                Models
              </h3>
              <span className="text-[10px] text-white/30">kishwifi.com</span>
            </div>

            {models.length === 0 ? (
              <div className="text-xs text-white/30 text-center py-4">
                No models available
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={clsx(
                      "rounded-xl p-3 border transition-colors",
                      model.active
                        ? "bg-brand-blue/10 border-brand-blue/20"
                        : "bg-white/[0.02] border-white/[0.06]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{model.name}</p>
                        <p className="text-[10px] text-white/30">{model.size}</p>
                      </div>
                      {model.active ? (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue font-bold">
                          ACTIVE
                        </span>
                      ) : model.downloaded ? (
                        <button
                          onClick={() => activateModelMut.mutate(model.id)}
                          disabled={activateModelMut.isPending}
                          className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white transition-colors"
                        >
                          Use
                        </button>
                      ) : (
                        <button
                          onClick={() => downloadModelMut.mutate(model.id)}
                          disabled={downloadModelMut.isPending}
                          className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/20 transition-colors"
                        >
                          <Download size={10} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-white/30 mt-1 line-clamp-2">{model.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Not loaded warning */}
          {!status.loaded && (
            <div className="rounded-xl p-3 bg-brand-amber/10 border border-brand-amber/20 text-brand-amber text-xs flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>No AI model is currently loaded. Download a model from the list above to get started.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
