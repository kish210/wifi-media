import { clsx } from "clsx";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div className={clsx("flex items-center justify-center", className)}>
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-brand-blue animate-spin" />
    </div>
  );
}
