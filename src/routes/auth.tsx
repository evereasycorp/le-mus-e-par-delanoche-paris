import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MuseumHeader, PageFrame, SectionLabel } from "@/components/museum-chrome";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrer au Musée — Delanoche Paris" },
      { name: "description", content: "Créer un compte ou se connecter pour visiter le Musée." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  displayName: z.string().trim().min(2, "Nom requis").max(60).optional(),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/etage/$num", params: { num: "1" } });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "reset") {
        const v = z.string().email().parse(email);
        const { error } = await supabase.auth.resetPasswordForEmail(v, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Un lien vous a été envoyé.");
        setMode("signin");
        return;
      }

      const parsed = schema.parse({
        email,
        password,
        displayName: mode === "signup" ? displayName : undefined,
      });

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            data: { display_name: parsed.displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Bienvenue au Musée.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (error) throw error;
        toast.success("Les portes s'ouvrent.");
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message : (err as Error).message;
      toast.error(msg || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <MuseumHeader />
      <PageFrame>
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <SectionLabel>
              <span className="mx-auto">Accès au Musée</span>
            </SectionLabel>
            <h1 className="mt-5 font-display text-3xl text-foreground">
              {mode === "signup"
                ? "Demander une invitation"
                : mode === "reset"
                  ? "Mot de passe oublié"
                  : "Se présenter à l'entrée"}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              La visite est réservée aux visiteurs enregistrés.
            </p>
          </div>

          <form onSubmit={onSubmit} className="gold-frame mt-10 space-y-5 px-6 py-7">
            {mode === "signup" && (
              <Field
                label="Nom de visiteur"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Comment vous nommer dans le Livre d'Or"
                autoComplete="name"
              />
            )}
            <Field
              label="Adresse e-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
            {mode !== "reset" && (
              <Field
                label="Mot de passe"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="8 caractères minimum"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-gold py-3 text-[10px] tracking-room uppercase text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "..."
                : mode === "signup"
                  ? "Entrer au Musée"
                  : mode === "reset"
                    ? "Recevoir le lien"
                    : "Ouvrir les portes"}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-[11px] text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("signup")} className="hover:text-gold">
                  Pas encore visiteur ?{" "}
                  <span className="text-gold-soft">Demander une invitation</span>
                </button>
                <button onClick={() => setMode("reset")} className="hover:text-gold">
                  Mot de passe oublié
                </button>
              </>
            ) : (
              <button onClick={() => setMode("signin")} className="hover:text-gold">
                Retour à la connexion
              </button>
            )}
            <Link
              to="/"
              className="mt-3 text-[10px] tracking-room uppercase text-muted-foreground hover:text-foreground"
            >
              ← Retour au Hall
            </Link>
          </div>
        </div>
      </PageFrame>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-room uppercase text-gold/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none"
      />
    </label>
  );
}
