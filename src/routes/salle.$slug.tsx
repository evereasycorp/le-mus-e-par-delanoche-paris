import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Heart, Globe, Instagram, ArrowLeft, MessageSquare } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MuseumHeader, SectionLabel } from "@/components/museum-chrome";
import { BadgePill, type BrandBadge } from "@/components/brand-badges";

export const Route = createFileRoute("/salle/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Salle — ${params.slug} — Le Musée` },
      { name: "description", content: `Salle d'exposition de ${params.slug} au Musée par Delanoche Paris.` },
    ],
  }),
  component: BrandRoomPage,
});

function BrandRoomPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  if (!user) return null;
  return <BrandRoom slug={slug} />;
}

type Brand = {
  id: string; slug: string; name: string; tagline: string | null;
  bio: string | null; history: string | null;
  logo_url: string | null; cover_url: string | null;
  website_url: string | null; instagram_handle: string | null;
  is_verified: boolean; is_founder: boolean; level: number;
  followers_count: number; collections_count: number;
  joined_museum_at: string;
  brand_badges: { badge: BrandBadge }[];
};

type Entry = {
  id: string; display_name: string; message: string; created_at: string; user_id: string;
};

function BrandRoom({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"wall" | "expo" | "livre">("wall");
  const qc = useQueryClient();

  const { data: brand, isLoading, error } = useQuery({
    queryKey: ["brand", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select(`
          id, slug, name, tagline, bio, history,
          logo_url, cover_url, website_url, instagram_handle,
          is_verified, is_founder, level,
          followers_count, collections_count, joined_museum_at,
          brand_badges ( badge:badges ( slug, label, icon ) )
        `)
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as unknown as Brand;
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["follow", slug, user?.id],
    enabled: !!brand && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("brand_id")
        .eq("brand_id", brand!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!brand || !user) return;
      if (isFollowing) {
        await supabase.from("follows").delete().eq("brand_id", brand.id).eq("user_id", user.id);
      } else {
        await supabase.from("follows").insert({ brand_id: brand.id, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow", slug] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isFollowing ? "Marque retirée de vos suivis" : "Marque ajoutée à vos suivis");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <MuseumHeader />
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="h-64 animate-pulse rounded-sm bg-surface" />
        </div>
      </div>
    );
  }
  if (error || !brand) {
    return (
      <div className="min-h-screen">
        <MuseumHeader />
        <div className="mx-auto max-w-5xl px-5 py-16 text-center">
          <p className="text-sm text-muted-foreground">Cette salle est introuvable.</p>
          <Link to="/etage/$num" params={{ num: "1" }} className="mt-4 inline-block text-[10px] tracking-room uppercase text-gold">
            ← Retour au couloir
          </Link>
        </div>
      </div>
    );
  }

  const badges = brand.brand_badges?.map((bb) => bb.badge).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen">
      <MuseumHeader />

      {/* Plaque / en-tête salle */}
      <section className="relative border-b border-border/60">
        <div className="mx-auto max-w-5xl px-5 pt-6">
          <Link
            to="/etage/$num"
            params={{ num: "1" }}
            className="inline-flex items-center gap-2 text-[10px] tracking-room uppercase text-muted-foreground hover:text-gold"
          >
            <ArrowLeft className="h-3 w-3" /> Couloir des créateurs
          </Link>
        </div>

        <div className="mx-auto max-w-5xl px-5 pb-10 pt-6 fade-up">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center border border-gold/40 bg-background/40 font-display text-3xl text-gold">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="h-full w-full object-cover" />
              ) : (
                brand.name.charAt(0)
              )}
            </div>
            <SectionLabel><span className="mx-auto mt-5 block">Salle de marque</span></SectionLabel>
            <h1 className="mt-3 font-display text-4xl text-foreground">{brand.name}</h1>
            {brand.tagline && (
              <p className="mt-2 text-sm italic text-muted-foreground">{brand.tagline}</p>
            )}

            {badges.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {badges.map((b) => <BadgePill key={b.slug} badge={b} size="md" />)}
              </div>
            )}

            <button
              onClick={() => toggleFollow.mutate()}
              disabled={toggleFollow.isPending}
              className={`mt-6 inline-flex items-center gap-2 rounded-sm border px-5 py-2 text-[10px] tracking-room uppercase transition-colors ${
                isFollowing
                  ? "border-gold bg-gold/10 text-gold-soft"
                  : "border-gold/40 text-gold-soft hover:bg-gold hover:text-primary-foreground"
              }`}
            >
              <Heart className={`h-3 w-3 ${isFollowing ? "fill-current" : ""}`} />
              {isFollowing ? "Suivi" : "Suivre cette maison"}
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-1 px-5">
            {([
              ["wall", "Wall"],
              ["expo", "Exposition"],
              ["livre", "Livre d'Or"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`relative px-5 py-3 text-[10px] tracking-room uppercase transition-colors ${
                  tab === k ? "text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {tab === k && <span className="absolute inset-x-2 -bottom-px h-px bg-gold" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-10">
        {tab === "wall" && <WallTab brand={brand} />}
        {tab === "expo" && <ExpoTab />}
        {tab === "livre" && <GuestbookTab brandId={brand.id} />}
      </div>
    </div>
  );
}

function WallTab({ brand }: { brand: Brand }) {
  const joined = new Date(brand.joined_museum_at);
  return (
    <div className="grid gap-8 md:grid-cols-3 fade-up">
      <div className="md:col-span-2">
        <SectionLabel>Présentation</SectionLabel>
        <p className="mt-4 font-display text-2xl leading-snug text-foreground">{brand.bio}</p>
        {brand.history && (
          <>
            <div className="my-8 gold-rule" />
            <SectionLabel>Histoire</SectionLabel>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{brand.history}</p>
          </>
        )}
      </div>

      <aside className="gold-frame space-y-5 p-6">
        <Stat label="Arrivée au Musée" value={joined.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} />
        <Stat label="Niveau" value={`${brand.level}`} />
        <Stat label="Collections" value={`${brand.collections_count}`} />
        <Stat label="Suivis" value={`${brand.followers_count}`} />

        {(brand.website_url || brand.instagram_handle) && (
          <div className="border-t border-border/60 pt-4">
            <p className="text-[10px] tracking-room uppercase text-gold/70">Présence</p>
            <div className="mt-3 flex flex-col gap-2 text-xs">
              {brand.website_url && (
                <a href={brand.website_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-gold">
                  <Globe className="h-3 w-3" /> Site officiel
                </a>
              )}
              {brand.instagram_handle && (
                <a href={`https://instagram.com/${brand.instagram_handle}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-gold">
                  <Instagram className="h-3 w-3" /> @{brand.instagram_handle}
                </a>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] tracking-room uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl text-foreground capitalize">{value}</p>
    </div>
  );
}

function ExpoTab() {
  return (
    <div className="gold-frame mx-auto max-w-md p-10 text-center fade-up">
      <SectionLabel><span className="mx-auto">Exposition</span></SectionLabel>
      <p className="mt-6 font-display text-2xl text-foreground">
        Les vitrines sont en cours d'installation
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Les pièces de cette maison rejoindront prochainement la galerie. Suivez la marque
        pour être prévenu·e dès l'ouverture de l'exposition.
      </p>
    </div>
  );
}

const entrySchema = z.object({
  message: z.string().trim().min(2, "Message trop court").max(800, "800 caractères maximum"),
});

function GuestbookTab({ brandId }: { brandId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["guestbook", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guestbook_entries")
        .select("id, display_name, message, created_at, user_id")
        .eq("brand_id", brandId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Entry[];
    },
  });

  const add = useMutation({
    mutationFn: async (message: string) => {
      const { data: profile } = await supabase
        .from("profiles").select("display_name").eq("id", user!.id).maybeSingle();
      const displayName = profile?.display_name || user!.email?.split("@")[0] || "Visiteur";
      const { error } = await supabase.from("guestbook_entries").insert({
        brand_id: brandId,
        user_id: user!.id,
        display_name: displayName,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      toast.success("Inscrit au Livre d'Or");
      qc.invalidateQueries({ queryKey: ["guestbook", brandId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = entrySchema.safeParse({ message: text });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    add.mutate(parsed.data.message);
  }

  return (
    <div className="mx-auto max-w-2xl fade-up">
      <div className="text-center">
        <SectionLabel><span className="mx-auto">Livre d'Or</span></SectionLabel>
        <h2 className="mt-3 font-display text-2xl text-foreground">Laissez une trace de votre passage</h2>
      </div>

      <form onSubmit={submit} className="gold-frame mt-8 p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={800}
          rows={3}
          placeholder="Vos mots sur cette maison…"
          className="w-full resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[10px] text-muted-foreground">{text.length}/800</span>
          <button
            type="submit"
            disabled={add.isPending}
            className="rounded-sm bg-gold px-5 py-1.5 text-[10px] tracking-room uppercase text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Signer
          </button>
        </div>
      </form>

      <div className="mt-10 space-y-5">
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-sm bg-surface" />
        ) : entries && entries.length > 0 ? (
          entries.map((e) => (
            <article key={e.id} className="border-b border-border/40 pb-5">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-base text-gold-soft">{e.display_name}</p>
                <p className="text-[10px] tracking-room uppercase text-muted-foreground">
                  {formatDistanceToNow(new Date(e.created_at), { locale: fr, addSuffix: true })}
                </p>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{e.message}</p>
            </article>
          ))
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto h-5 w-5 text-gold/40" />
            <p className="mt-3">Soyez le premier à inscrire un mot dans ce livre.</p>
          </div>
        )}
      </div>
    </div>
  );
}
