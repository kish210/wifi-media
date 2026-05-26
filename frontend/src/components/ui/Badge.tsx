import { clsx } from "clsx";

type Variant = "blue" | "purple" | "teal" | "amber" | "green" | "red" | "ghost";

const variants: Record<Variant, string> = {
  blue:   "bg-brand-blue/20 text-brand-blue border-brand-blue/30",
  purple: "bg-brand-purple/20 text-brand-purple border-brand-purple/30",
  teal:   "bg-brand-teal/20 text-brand-teal border-brand-teal/30",
  amber:  "bg-brand-amber/20 text-brand-amber border-brand-amber/30",
  green:  "bg-brand-green/20 text-brand-green border-brand-green/30",
  red:    "bg-red-500/20 text-red-400 border-red-500/30",
  ghost:  "bg-white/[0.06] text-white/60 border-white/[0.08]",
};

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export default function Badge({ children, variant = "ghost", className }: Props) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      variants[variant], className
    )}>
      {children}
    </span>
  );
}
