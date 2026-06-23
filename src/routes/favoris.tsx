import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowUpRight, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MuseumHeader, PageFrame, SectionLabel } from "@/components/museum-chrome";
import { BadgePill, type BrandBadge } from "@/components/brand-badges";

export const Route = createFileRoute("/favoris")({
  head: () => ({
    meta: [{ title: "Mes maisons suivies — Le Musée" }],
  }),
  component: FavoritesPage,
});

type Row = {
  brand: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    is_verified: boolean;
    level: number;
    brand_badges: { badge: BrandBadge }[];
  };
};

function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(
          `
          brand:brands (
            id, slug, name, tagline, is_verified, level,
            brand_badges ( badge:badges ( slug, label, icon ) )
          )
        `,
        )
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div className="min-h-screen">
      <MuseumHeader />
      <PageFrame>
        <div className="text-center">
          <SectionLabel>
            <span className="mx-auto">Votre carnet</span>
          </SectionLabel>
          <h1 className="mt-4 font-display text-3xl text-foreground">Maisons suivies</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vos coups de cœur, leurs badges et leurs nouveautés.
          </p>
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-sm bg-surface" />
          ) : !data || data.length === 0 ? (
            <div className="gold-frame mx-auto max-w-md p-10 text-center">
              <Heart className="mx-auto h-6 w-6 text-gold/60" />
              <p className="mt-4 font-display text-xl text-foreground">Aucune maison suivie</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Parcourez le couloir et choisissez les maisons qui vous touchent.
              </p>
              <Link
                to="/etage/$num"
                params={{ num: "1" }}
                className="mt-6 inline-block rounded-sm bg-gold px-5 py-2 text-[10px] tracking-room uppercase text-primary-foreground hover:opacity-90"
              >
                Visiter l'Étage 1
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {data.map(({ brand }) => {
                const badges = brand.brand_badges?.map((bb) => bb.badge).filter(Boolean) ?? [];
                return (
                  <li key={brand.id}>
                    <Link
                      to="/salle/$slug"
                      params={{ slug: brand.slug }}
                      className="gold-frame group flex items-center gap-4 px-5 py-5 transition-all hover:translate-y-[-1px]"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-gold/30 bg-background/40 font-display text-lg text-gold">
                        {brand.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-lg text-foreground">
                          {brand.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">{brand.tagline}</p>
                        {badges.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {badges.slice(0, 3).map((b) => (
                              <BadgePill key={b.slug} badge={b} />
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-gold transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PageFrame>
    </div>
  );
}
