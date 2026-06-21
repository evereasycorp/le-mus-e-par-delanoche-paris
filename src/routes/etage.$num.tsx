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

  const items: CorridorItem[] = (brands ?? []).map((b, i) => ({
    id: b.id,
    slug: b.slug,
    rank: i + 1,
    name: b.name,
    tagline: b.tagline,
    logoUrl: b.logo_url,
    level: b.level,
    badges: (b.brand_badges ?? []).map((bb) => bb.badge).filter(Boolean) as BrandBadge[],
  }));

  return (
    <div className="min-h-screen">
      <MuseumHeader />

      {isLoading ? (
        <PageFrame>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-sm bg-surface" />
            ))}
          </div>
        </PageFrame>
      ) : items.length === 0 ? (
        <PageFrame>
          <p className="text-center text-sm text-muted-foreground">
            Aucune maison n'a encore ouvert ses portes dans ce couloir.
          </p>
        </PageFrame>
      ) : (
        <CorridorScene
          items={items}
          header={
            <>
              <p className="text-[10px] tracking-museum uppercase text-gold">Étage 1</p>
              <h1 className="mt-1 font-display text-2xl text-gold-soft">Couloir des créateurs</h1>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Faites défiler pour avancer · {items.length} maison{items.length > 1 ? "s" : ""}
              </p>
            </>
          }
        />
      )}
    </div>
  );
}

