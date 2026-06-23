import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  X,
  Trash2,
  Search,
  Award,
  Shield,
  Users,
  MessageSquare,
  Flag,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cabinet du Musée — Administration" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type Section = "stats" | "brands" | "creators" | "badges" | "users" | "guestbook" | "reports";

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");
  const [section, setSection] = useState<Section>("stats");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/admin" } as never });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setStatus(data ? "ok" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading || status === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground/60">
        <p className="font-serif italic">Vérification des accès…</p>
      </main>
    );
  }
  if (status === "denied") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <h1 className="font-serif text-3xl text-foreground">Accès réservé</h1>
        <p className="text-foreground/60 max-w-sm">Cette salle est réservée aux conservateurs.</p>
        <Link to="/" className="gold-frame px-6 py-3 text-sm uppercase tracking-[0.2em]">
          Retour au Hall
        </Link>
      </main>
    );
  }

  const tabs: { id: Section; label: string; icon: typeof Award }[] = [
    { id: "stats", label: "Statistiques", icon: BarChart3 },
    { id: "creators", label: "Créateurs", icon: ClipboardCheck },
    { id: "brands", label: "Marques", icon: Shield },
    { id: "badges", label: "Badges", icon: Award },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "guestbook", label: "Livre d'Or", icon: MessageSquare },
    { id: "reports", label: "Signalements", icon: Flag },
  ];

  return (
    <main className="min-h-screen bg-background pb-24 pt-10 text-foreground">
      <div className="mx-auto max-w-6xl px-5">
        <header className="text-center">
          <p className="text-[10px] tracking-room uppercase text-gold/80">Conservateur</p>
          <h1 className="mt-2 font-display text-4xl text-foreground">Cabinet du Musée</h1>
          <p className="mt-2 text-xs italic text-muted-foreground">{user?.email}</p>
          <Link
            to="/admin-calibrate"
            search={{ roomId: "" } as never}
            className="mt-3 inline-block rounded-sm border border-gold/50 px-3 py-1 text-[10px] uppercase tracking-room text-gold hover:bg-gold hover:text-primary-foreground"
          >
            Calibration hotspots 360°
          </Link>
        </header>

        <nav className="mt-8 -mx-5 overflow-x-auto px-5">
          <div className="flex min-w-max gap-1 border-b border-border/60">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = section === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSection(t.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-[10px] tracking-room uppercase transition-colors ${
                    active
                      ? "border-b-2 border-gold text-gold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-10">
          {section === "stats" && <StatsPanel />}
          {section === "brands" && <BrandsPanel />}
          {section === "creators" && <CreatorsPanel />}
          {section === "badges" && <BadgesPanel />}
          {section === "users" && <UsersPanel />}
          {section === "guestbook" && <GuestbookPanel />}
          {section === "reports" && <ReportsPanel />}
        </div>
      </div>
    </main>
  );
}

/* ---------- Statistiques ---------- */
function StatsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [brandsAll, brandsPub, pieces, users, sales] = await Promise.all([
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase
          .from("brands")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true),
        supabase.from("pieces").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("sales_total"),
      ]);
      const totalSales = (sales.data ?? []).reduce(
        (s, r: { sales_total: number }) => s + Number(r.sales_total || 0),
        0,
      );
      return {
        brandsAll: brandsAll.count ?? 0,
        brandsPub: brandsPub.count ?? 0,
        pieces: pieces.count ?? 0,
        users: users.count ?? 0,
        totalSales,
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-sm bg-surface" />
        ))}
      </div>
    );
  }
  const cards = [
    { label: "Marques publiées", value: `${data.brandsPub} / ${data.brandsAll}` },
    { label: "Pièces exposées", value: `${data.pieces}` },
    { label: "Utilisateurs", value: `${data.users}` },
    {
      label: "Ventes cumulées",
      value: data.totalSales.toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="gold-frame p-5">
          <p className="text-[10px] tracking-room uppercase text-muted-foreground">{c.label}</p>
          <p className="mt-2 font-display text-3xl text-gold-soft">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Marques en attente ---------- */
function BrandsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "brands-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, slug, name, tagline, is_published, created_at")
        .eq("is_published", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setPublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("brands").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brands-pending"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Marque mise à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brands-pending"] });
      toast.success("Marque refusée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel
      title="Marques en attente de validation"
      empty={!isLoading && (!data || data.length === 0)}
      emptyText="Aucune marque en attente."
    >
      {data?.map((b) => (
        <Row key={b.id}>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg text-foreground">{b.name}</p>
            <p className="truncate text-xs text-muted-foreground">{b.tagline ?? b.slug}</p>
          </div>
          <div className="flex gap-2">
            <ActionBtn
              onClick={() => setPublished.mutate({ id: b.id, is_published: true })}
              variant="ok"
            >
              <Check className="h-3 w-3" /> Approuver
            </ActionBtn>
            <ActionBtn onClick={() => remove.mutate(b.id)} variant="danger">
              <X className="h-3 w-3" /> Refuser
            </ActionBtn>
          </div>
        </Row>
      ))}
    </Panel>
  );
}

/* ---------- Créateurs en attente (profils sans marque publiée) ---------- */
function CreatorsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "creators-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, slug, owner_id, created_at, is_published")
        .eq("is_published", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("brands")
        .update({ is_published: true, is_verified: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "creators-pending"] });
      qc.invalidateQueries({ queryKey: ["admin", "brands-pending"] });
      toast.success("Créateur approuvé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel
      title="Demandes de créateurs"
      empty={!isLoading && (!data || data.length === 0)}
      emptyText="Aucune demande en attente."
    >
      {data?.map((b) => (
        <Row key={b.id}>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg text-foreground">{b.name}</p>
            <p className="text-[10px] tracking-room uppercase text-muted-foreground">
              Propriétaire : {b.owner_id ?? "—"}
            </p>
          </div>
          <ActionBtn onClick={() => approve.mutate(b.id)} variant="ok">
            <Check className="h-3 w-3" /> Approuver & vérifier
          </ActionBtn>
        </Row>
      ))}
    </Panel>
  );
}

/* ---------- Badges ---------- */
function BadgesPanel() {
  const qc = useQueryClient();
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("");

  const { data: badges } = useQuery({
    queryKey: ["admin", "badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("id, slug, label, icon, description")
        .order("label");
      if (error) throw error;
      return data;
    },
  });
  const { data: brands } = useQuery({
    queryKey: ["admin", "brands-all-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!slug || !label) throw new Error("Slug et label requis");
      const { error } = await supabase.from("badges").insert({ slug, label, icon: icon || null });
      if (error) throw error;
    },
    onSuccess: () => {
      setSlug("");
      setLabel("");
      setIcon("");
      qc.invalidateQueries({ queryKey: ["admin", "badges"] });
      toast.success("Badge créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("badges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "badges"] });
      toast.success("Badge supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const attribute = useMutation({
    mutationFn: async ({ brand_id, badge_id }: { brand_id: string; badge_id: string }) => {
      const { error } = await supabase.from("brand_badges").insert({ brand_id, badge_id });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Badge attribué"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <Panel title="Créer un badge" empty={false}>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug (ex: pionnier)"
            className="border border-border/60 bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé"
            className="border border-border/60 bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Icône (optionnel)"
            className="border border-border/60 bg-transparent px-3 py-2 text-sm"
          />
          <ActionBtn onClick={() => create.mutate()} variant="ok">
            Créer
          </ActionBtn>
        </div>
      </Panel>

      <Panel
        title={`Badges existants (${badges?.length ?? 0})`}
        empty={!badges || badges.length === 0}
        emptyText="Aucun badge."
      >
        {badges?.map((b) => (
          <Row key={b.id}>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base text-gold-soft">{b.label}</p>
              <p className="text-[10px] tracking-room uppercase text-muted-foreground">{b.slug}</p>
            </div>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) attribute.mutate({ brand_id: e.target.value, badge_id: b.id });
                e.target.value = "";
              }}
              className="border border-border/60 bg-background px-2 py-1.5 text-xs"
            >
              <option value="">Attribuer à…</option>
              {brands?.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.name}
                </option>
              ))}
            </select>
            <ActionBtn onClick={() => remove.mutate(b.id)} variant="danger">
              <Trash2 className="h-3 w-3" />
            </ActionBtn>
          </Row>
        ))}
      </Panel>
    </div>
  );
}

/* ---------- Utilisateurs ---------- */
function UsersPanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [{ data: profs, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, is_suspended").order("display_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r: { user_id: string; role: string }) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });
      return (profs ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] }));
    },
  });

  const setSuspended = useMutation({
    mutationFn: async ({ id, is_suspended }: { id: string; is_suspended: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_suspended }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Utilisateur mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(
      (u) => (u.display_name ?? "").toLowerCase().includes(needle) || u.id.includes(needle),
    );
  }, [data, q]);

  return (
    <Panel
      title={`Utilisateurs (${data?.length ?? 0})`}
      empty={!isLoading && filtered.length === 0}
      emptyText="Aucun utilisateur."
    >
      <div className="mb-4 flex items-center gap-2 border border-border/60 px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom ou identifiant…"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>
      {filtered.map((u) => (
        <Row key={u.id}>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base text-foreground">{u.display_name ?? "—"}</p>
            <p className="truncate text-[10px] tracking-room uppercase text-muted-foreground">
              {u.id}
            </p>
            {u.roles.length > 0 && (
              <p className="mt-1 text-[10px] tracking-room uppercase text-gold/70">
                {u.roles.join(" · ")}
              </p>
            )}
          </div>
          {u.is_suspended ? (
            <ActionBtn
              onClick={() => setSuspended.mutate({ id: u.id, is_suspended: false })}
              variant="ok"
            >
              Réactiver
            </ActionBtn>
          ) : (
            <ActionBtn
              onClick={() => setSuspended.mutate({ id: u.id, is_suspended: true })}
              variant="danger"
            >
              Suspendre
            </ActionBtn>
          )}
        </Row>
      ))}
    </Panel>
  );
}

/* ---------- Livre d'Or (modération) ---------- */
function GuestbookPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "guestbook"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guestbook_entries")
        .select("id, display_name, message, created_at, is_hidden, brand_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guestbook_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "guestbook"] });
      toast.success("Entrée supprimée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel
      title="Modération du Livre d'Or"
      empty={!isLoading && (!data || data.length === 0)}
      emptyText="Aucune entrée."
    >
      {data?.map((e) => (
        <Row key={e.id}>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base text-gold-soft">{e.display_name}</p>
            <p className="mt-1 text-sm text-foreground/90">{e.message}</p>
            <p className="mt-1 text-[10px] tracking-room uppercase text-muted-foreground">
              {new Date(e.created_at).toLocaleString("fr-FR")} {e.is_hidden ? "· masqué" : ""}
            </p>
          </div>
          <ActionBtn onClick={() => remove.mutate(e.id)} variant="danger">
            <Trash2 className="h-3 w-3" /> Supprimer
          </ActionBtn>
        </Row>
      ))}
    </Panel>
  );
}

/* ---------- Signalements (placeholder pour V2) ---------- */
function ReportsPanel() {
  return (
    <Panel
      title="Signalements"
      empty={true}
      emptyText="Le module de signalement sera ouvert prochainement (queue, suivi, résolution). Pour l'instant, les contenus problématiques se gèrent via la modération du Livre d'Or et la suspension d'utilisateurs."
    >
      {null}
    </Panel>
  );
}

/* ---------- Primitives UI ---------- */
function Panel({
  title,
  children,
  empty,
  emptyText,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  emptyText?: string;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <div className="mt-4 space-y-2">
        {empty ? (
          <div className="gold-frame p-8 text-center text-sm text-muted-foreground">
            {emptyText ?? "Aucun élément."}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="gold-frame flex flex-wrap items-center gap-3 p-4">{children}</div>;
}
function ActionBtn({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "ok" | "danger" | "neutral";
}) {
  const cls =
    variant === "ok"
      ? "border-gold/60 text-gold hover:bg-gold hover:text-primary-foreground"
      : variant === "danger"
        ? "border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        : "border-border text-foreground hover:bg-surface";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] tracking-room uppercase transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}
