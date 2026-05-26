import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wifi, Play, Film, Music, Gamepad2, Users, ArrowRight, Signal, Zap, Shield } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useAuthStore } from "@/store/authStore";

const features = [
  { icon: Wifi,     title: "100% Offline",    desc: "Works without internet. Your local network is the cloud.",        color: "from-brand-blue to-brand-teal" },
  { icon: Play,     title: "Live TV",          desc: "Watch live channels via TVHeadend on your local network.",        color: "from-red-500 to-brand-amber" },
  { icon: Film,     title: "Movies & Series",  desc: "Full local media library. Stream anything from your server.",     color: "from-brand-purple to-brand-pink" },
  { icon: Music,    title: "Music",            desc: "Play your local music collection. All formats supported.",        color: "from-brand-teal to-brand-green" },
  { icon: Gamepad2, title: "Local Games",      desc: "Built-in LAN games. No internet required.",                      color: "from-brand-amber to-red-500" },
  { icon: Users,    title: "Watch Parties",    desc: "Watch together in sync. Chat, react, enjoy as a group.",         color: "from-brand-pink to-brand-purple" },
];

const stats = [
  { icon: Signal, label: "Local streaming",    value: "0ms lag" },
  { icon: Zap,    label: "Adaptive quality",   value: "HLS ABR" },
  { icon: Shield, label: "Private & secure",   value: "LAN only" },
  { icon: Users,  label: "Concurrent users",   value: "100+" },
];

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) navigate("/home");
  }, [user]);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${p.a})`;
        ctx.fill();
      }
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${(1 - dist / 100) * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="min-h-screen bg-base-950 text-white overflow-hidden">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />

      {/* Radial glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-6">
          <Logo size="md" />
          <div className="flex gap-3">
            <button onClick={() => navigate("/login")} className="btn-ghost text-sm">
              Sign In
            </button>
            <button onClick={() => navigate("/login?register=1")} className="btn-primary text-sm">
              Get Started
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-8 pt-16 pb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-blue/20 text-sm text-brand-blue mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              Running on your local network
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-6 max-w-4xl"
          >
            Entertainment{" "}
            <span className="text-gradient">Anywhere.</span>
            <br />
            <span className="text-white/90">Offline.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-white/50 max-w-2xl mb-10 leading-relaxed"
          >
            WiFi-Media is a complete local network entertainment platform. Live TV, movies,
            music, games and watch parties — all over your local Wi-Fi, no internet required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 transition-opacity shadow-glow"
            >
              <Play size={18} fill="white" />
              Start Watching
            </button>
            <button
              onClick={() => navigate("/network")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base glass border border-white/10 hover:border-white/20 transition-colors"
            >
              Network Status
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </section>

        {/* Stats bar */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto px-8 mb-24"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass border border-white/[0.06] rounded-2xl p-4 text-center"
              >
                <s.icon size={20} className="text-brand-blue mx-auto mb-2" />
                <p className="text-xl font-bold text-gradient">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features grid */}
        <motion.section
          variants={stagger.container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-6xl mx-auto px-8 mb-24"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Everything you need.{" "}
              <span className="text-gradient">Nothing you don't.</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Built for trains, buses, hotels, and anywhere Wi-Fi without internet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={stagger.item}
                className="glass border border-white/[0.06] rounded-2xl p-5 hover:border-brand-blue/20 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <f.icon size={18} className="text-white" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <section className="text-center px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto glass border border-white/[0.08] rounded-3xl p-10"
          >
            <h2 className="text-3xl font-display font-bold mb-3">Ready to watch?</h2>
            <p className="text-white/40 mb-6">Connect to the local Wi-Fi and start streaming.</p>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary text-base px-10 py-3"
            >
              Enter WiFi-Media
            </button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.05] py-6 px-8 text-center text-xs text-white/25">
          WiFi-Media · Local Network Entertainment Platform · No internet required
        </footer>
      </div>
    </div>
  );
}
