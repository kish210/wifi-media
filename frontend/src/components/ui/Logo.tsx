import { Wifi } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { icon: 18, text: "text-lg", sub: "text-[9px]" },
  md: { icon: 24, text: "text-2xl", sub: "text-[10px]" },
  lg: { icon: 36, text: "text-4xl", sub: "text-xs" },
};

export default function Logo({ size = "md", className }: Props) {
  const s = sizes[size];
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="absolute inset-0 blur-md bg-brand-blue/60 rounded-full" />
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue via-brand-purple to-brand-teal flex items-center justify-center">
          <Wifi size={s.icon} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className={clsx("font-display font-bold tracking-tight text-gradient", s.text)}>
          WiFi<span className="text-white">·</span>Media
        </span>
        <span className={clsx("text-white/40 font-medium tracking-widest uppercase", s.sub)}>
          Local Entertainment
        </span>
      </div>
    </div>
  );
}
