import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Le Musée par Delanoche Paris" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/admin" } as never });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setStatus(!error && data ? "ok" : "denied");
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
        <p className="text-foreground/60 max-w-sm">
          Cette salle est réservée aux conservateurs du Musée.
        </p>
        <Link to="/" className="gold-frame px-6 py-3 text-sm uppercase tracking-[0.2em]">
          Retour au Hall
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Conservateur</p>
          <h1 className="font-serif text-4xl">Cabinet du Musée</h1>
          <p className="text-foreground/60 font-serif italic">
            Espace d'administration — back-office complet à venir.
          </p>
        </header>

        <section className="gold-frame p-8 space-y-3">
          <h2 className="font-serif text-2xl">Bienvenue</h2>
          <p className="text-foreground/70 text-sm">
            Vous êtes connecté en tant qu'administrateur. Les modules de validation des
            créateurs, modération du Livre d'Or et attribution des badges seront ajoutés
            dans une prochaine étape.
          </p>
          <p className="text-foreground/50 text-xs">Identifiant : {user?.email}</p>
        </section>
      </div>
    </main>
  );
}
