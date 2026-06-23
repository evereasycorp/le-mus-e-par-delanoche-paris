import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEV_ADMIN_EMAIL, DEV_ADMIN_PASSWORD, ensureDevAdmin } from "@/lib/dev-admin.functions";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — connexion" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (id !== "1234" || pwd !== "1234") {
      setError("Identifiants invalides.");
      return;
    }
    setLoading(true);
    try {
      await ensureDevAdmin();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: DEV_ADMIN_EMAIL,
        password: DEV_ADMIN_PASSWORD,
      });
      if (signErr) throw signErr;
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="gold-frame w-full max-w-sm space-y-6 p-8">
        <header className="text-center space-y-2">
          <p className="text-[10px] tracking-museum uppercase text-gold/80">Dev</p>
          <h1 className="font-display text-2xl text-foreground">Connexion admin</h1>
          <p className="text-xs text-muted-foreground">
            Accès provisoire — à retirer avant production.
          </p>
        </header>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-room text-muted-foreground">
            Identifiant
          </span>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-room text-muted-foreground">
            Mot de passe
          </span>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </label>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-gold px-4 py-2.5 text-[10px] tracking-room uppercase text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Entrer"}
        </button>

        <Link
          to="/"
          className="block text-center text-[10px] tracking-museum uppercase text-muted-foreground hover:text-gold"
        >
          ← Retour au Hall
        </Link>
      </form>
    </main>
  );
}
