import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MuseumHeader, PageFrame, SectionLabel } from "@/components/museum-chrome";
import { type BrandBadge } from "@/components/brand-badges";
import { CorridorScene, type CorridorItem } from "@/components/corridor-scene";

export const Route = createFileRoute("/etage/$num")({
  head: ({ params }) => ({
    meta: [
      { title: `Étage ${params.num} — Le Musée par Delanoche Paris` },
      { name: "description", content: `Couloir de l'étage ${params.num} : portes des maisons, classées par rayonnement.` },
    ],
  }),
  component: FloorPage,
});

const FLOORS: Record<string, { label: string; subtitle: string; open: boolean }> = {
  "1": { label: "Vêtements", subtitle: "Couloir des créateurs", open: true },
  "2": { label: "Art", subtitle: "En préparation", open: false },
  "3": { label: "Livres", subtitle: "En préparation", open: false },
};

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  is_verified: boolean;
  is_founder: boolean;
  level: number;
  rank_score: number;
  brand_badges: { badge: BrandBadge }[];
};

function FloorPage() {
  const { num } = Route.useParams();
  const floor = FLOORS[num];
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  if (!floor) {
    return (
      <div className="min-h-screen">
        <MuseumHeader />
        <PageFrame>
          <p className="text-center text-sm text-muted-foreground">Cet étage n'existe pas.</p>
        </PageFrame>
      </div>
    );
  }

  if (!floor.open) {
    return (
      <div className="min-h-screen">
        <MuseumHeader />
        <PageFrame>
          <div className="mx-auto max-w-md text-center">
            <Lock className="mx-auto h-8 w-8 text-gold/70" />
            <SectionLabel><span className="mx-auto mt-4 block">Étage {num}</span></SectionLabel>
            <h1 className="mt-4 font-display text-3xl text-foreground">{floor.label}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Cet étage du Musée n'a pas encore été inauguré. Revenez le visiter prochainement.
            </p>
            <Link to="/" className="mt-8 inline-block text-[10px] tracking-room uppercase text-gold hover:text-gold-soft">
              ← Retour au Hall
            </Link>
          </div>
        </PageFrame>
      </div>
    );
  }

  return <Corridor />;
}

function Corridor() {
  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands", "vetements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select(`
          id, slug, name, tagline, logo_url,
          is_verified, is_founder, level, rank_score,
          brand_badges (
            badge:badges ( slug, label, icon )
          )
        `)
        .eq("category", "vetements")
        .eq("is_published", true)
        .order("rank_score", { ascending: false });
      if (error) throw error;
      return data as unknown as BrandRow[];
    },
  });

  return (
    <div className="min-h-screen">
      <MuseumHeader />

      {/* Bannière couloir */}
      <section className="relative h-44 w-full overflow-hidden border-b border-border/60">
        <img
          src={corridorImg}
          alt="Couloir des créateurs"
          loading="lazy"
          width={1280}
          height={800}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background" />
        <div className="vignette absolute inset-0" />
        <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-5 text-center">
          <p className="text-[10px] tracking-museum uppercase text-gold">Étage 1</p>
          <h1 className="mt-2 font-display text-3xl text-gold-soft">Couloir des créateurs</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Classement par rayonnement · ventes · satisfaction · activité
          </p>
        </div>
      </section>

      <PageFrame>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-sm bg-surface" />
            ))}
          </div>
        ) : (
          <ol className="space-y-4">
            {brands?.map((b, i) => (
              <li key={b.id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <BrandDoor brand={b} rank={i + 1} />
              </li>
            ))}
          </ol>
        )}
      </PageFrame>
    </div>
  );
}

function BrandDoor({ brand, rank }: { brand: BrandRow; rank: number }) {
  const badges = brand.brand_badges?.map((bb) => bb.badge).filter(Boolean) ?? [];
  return (
    <Link
      to="/salle/$slug"
      params={{ slug: brand.slug }}
      className="gold-frame group relative block overflow-hidden px-5 py-5 transition-all hover:translate-y-[-1px] sm:px-7 sm:py-6"
    >
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 shimmer-gold pointer-events-none" />
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-gold/30 bg-background/40 font-display text-xl text-gold">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="h-full w-full object-cover" />
          ) : (
            brand.name.charAt(0)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] tracking-room uppercase text-gold/70">N° {String(rank).padStart(2, "0")}</span>
            <span className="text-[10px] tracking-room uppercase text-muted-foreground">Niv. {brand.level}</span>
          </div>
          <h3 className="mt-0.5 truncate font-display text-xl text-foreground">{brand.name}</h3>
          {brand.tagline && (
            <p className="truncate text-xs text-muted-foreground">{brand.tagline}</p>
          )}
          {badges.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {badges.slice(0, 4).map((bd) => (
                <BadgePill key={bd.slug} badge={bd} />
              ))}
            </div>
          )}
        </div>

        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}
