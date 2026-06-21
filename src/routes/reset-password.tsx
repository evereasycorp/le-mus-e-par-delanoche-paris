import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MuseumHeader, PageFrame, SectionLabel } from "@/components/museum-chrome";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nouveau mot de passe — Le Musée" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().min(8, "8 caractères minimum").safeParse(password);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      toast.success("Mot de passe mis à jour.");
      navigate({ to: "/etage/$num", params: { num: "1" } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <MuseumHeader />
      <PageFrame>
        <div className="mx-auto max-w-md text-center">
          <SectionLabel><span className="mx-auto">Sécurité</span></SectionLabel>
          <h1 className="mt-4 font-display text-3xl text-foreground">Nouveau mot de passe</h1>
        </div>
        <form onSubmit={onSubmit} className="gold-frame mx-auto mt-8 max-w-md space-y-5 p-6">
          <label className="block">
            <span className="block text-[10px] tracking-room uppercase text-gold/70">Nouveau mot de passe</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-sm focus:border-gold focus:outline-none"
            />
          </label>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-sm bg-gold py-3 text-[10px] tracking-room uppercase text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Mettre à jour
          </button>
        </form>
      </PageFrame>
    </div>
  );
}
