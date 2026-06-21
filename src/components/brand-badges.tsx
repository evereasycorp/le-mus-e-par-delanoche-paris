import {
  ShieldCheck, Crown, Sparkles, Coins, Package,
  Award, Star, Gem, Flame, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "shield-check": ShieldCheck,
  crown: Crown,
  sparkles: Sparkles,
  coins: Coins,
  package: Package,
  award: Award,
  star: Star,
  gem: Gem,
  flame: Flame,
};

export type BrandBadge = {
  slug: string;
  label: string;
  icon: string | null;
};

export function BadgePill({ badge, size = "sm" }: { badge: BrandBadge; size?: "sm" | "md" }) {
  const Icon = (badge.icon && ICONS[badge.icon]) || Star;
  const isFounder = badge.slug === "founder";
  const isVerified = badge.slug === "verified";
  const sizes = size === "md"
    ? "h-7 px-2.5 text-[10px]"
    : "h-5 px-2 text-[9px]";
  return (
    <span
      title={badge.label}
      className={`inline-flex items-center gap-1 rounded-sm border tracking-room uppercase ${sizes} ${
        isFounder
          ? "border-gold/70 bg-gold/10 text-gold-soft"
          : isVerified
          ? "border-gold/40 text-gold"
          : "border-border text-muted-foreground"
      }`}
    >
      <Icon className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"} />
      <span className="font-sans">{badge.label}</span>
    </span>
  );
}
