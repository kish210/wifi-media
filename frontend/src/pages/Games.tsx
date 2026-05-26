import { useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Users, Zap, Trophy } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Game {
  id: string;
  title: string;
  description: string;
  players: string;
  emoji: string;
  color: string;
  available: boolean;
}

const GAMES: Game[] = [
  {
    id: "trivia",
    title: "LAN Trivia",
    description: "Compete with everyone on the network in real-time trivia rounds.",
    players: "2-20 players",
    emoji: "🧠",
    color: "from-brand-blue to-brand-teal",
    available: true,
  },
  {
    id: "pong",
    title: "Network Pong",
    description: "Classic Pong over LAN. Challenge anyone on the same Wi-Fi.",
    players: "2 players",
    emoji: "🏓",
    color: "from-brand-green to-brand-teal",
    available: true,
  },
  {
    id: "chess",
    title: "Chess",
    description: "Play chess against another user on the local network.",
    players: "2 players",
    emoji: "♟️",
    color: "from-white/20 to-white/10",
    available: true,
  },
  {
    id: "wordchain",
    title: "Word Chain",
    description: "A fast-paced word chain game. Last letter starts the next word.",
    players: "3-10 players",
    emoji: "📝",
    color: "from-brand-amber to-brand-pink",
    available: true,
  },
  {
    id: "pictionary",
    title: "Draw & Guess",
    description: "Draw on a shared canvas while others try to guess.",
    players: "3-12 players",
    emoji: "🎨",
    color: "from-brand-pink to-brand-purple",
    available: false,
  },
  {
    id: "jackbox",
    title: "Quick Quiz",
    description: "Host a quiz with custom questions for your group.",
    players: "2-15 players",
    emoji: "❓",
    color: "from-brand-purple to-brand-blue",
    available: false,
  },
];

// ── Trivia game component (demo) ─────────────────────────────────────────
function TriviaGame({ onExit }: { onExit: () => void }) {
  const [score, setScore] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);

  const questions = [
    { q: "What year was the first commercial Wi-Fi router released?", a: 1999, opts: [1995, 1999, 2001, 2003] },
    { q: "What does 'LAN' stand for?", a: "Local Area Network", opts: ["Large Area Network", "Long Access Network", "Local Area Network", "Linear Access Node"] },
    { q: "What streaming protocol does TVHeadend use?", a: "HLS", opts: ["RTMP", "RTSP", "HLS", "DASH"] },
  ];

  const current = questions[qIdx % questions.length];

  const handleAnswer = (opt: string | number) => {
    if (answered !== null) return;
    const idx = current.opts.indexOf(opt as never);
    setAnswered(idx);
    if (opt === current.a) setScore((s) => s + 10);
    setTimeout(() => {
      setAnswered(null);
      setQIdx((i) => i + 1);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-base-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs text-white/40">Question {(qIdx % questions.length) + 1}/{questions.length}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Trophy size={14} className="text-brand-amber" />
              <span className="font-bold text-brand-amber">{score} pts</span>
            </div>
          </div>
          <button onClick={onExit} className="btn-ghost text-sm">Exit</button>
        </div>

        <div className="glass-strong rounded-2xl p-6 mb-4 border border-white/[0.1]">
          <p className="text-lg font-semibold mb-6 leading-relaxed">{current.q}</p>
          <div className="grid grid-cols-2 gap-3">
            {current.opts.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: answered === null ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(opt)}
                className={`p-3 rounded-xl text-sm font-medium text-left transition-all border ${
                  answered === null
                    ? "border-white/[0.08] hover:border-brand-blue/40 hover:bg-brand-blue/10"
                    : answered === i
                      ? opt === current.a
                        ? "border-brand-green bg-brand-green/20 text-brand-green"
                        : "border-red-500 bg-red-500/20 text-red-400"
                      : opt === current.a
                        ? "border-brand-green bg-brand-green/20 text-brand-green"
                        : "border-white/[0.04] opacity-50"
                }`}
              >
                {String(opt)}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Games() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  if (activeGame === "trivia") {
    return <TriviaGame onExit={() => setActiveGame(null)} />;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Gamepad2 size={20} className="text-brand-blue" />
        <h2 className="text-xl font-semibold">Games</h2>
      </div>
      <p className="text-white/40 text-sm mb-8">LAN games — no internet required. Play with anyone on the network.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`relative glass border rounded-2xl overflow-hidden transition-all ${
              game.available
                ? "border-white/[0.06] hover:border-brand-blue/30 cursor-pointer group"
                : "border-white/[0.04] opacity-50"
            }`}
            onClick={() => game.available && setActiveGame(game.id)}
          >
            {/* Gradient header */}
            <div className={`h-24 bg-gradient-to-br ${game.color} flex items-center justify-center`}>
              <span className="text-5xl">{game.emoji}</span>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="font-semibold">{game.title}</h3>
                {!game.available && <Badge variant="ghost">Coming soon</Badge>}
              </div>
              <p className="text-sm text-white/40 leading-relaxed mb-3">{game.description}</p>
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <Users size={11} />
                <span>{game.players}</span>
              </div>
            </div>

            {game.available && (
              <div className="absolute inset-0 bg-brand-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
