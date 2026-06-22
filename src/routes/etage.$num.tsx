import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MuseumHeader, PageFrame, SectionLabel } from "@/components/museum-chrome";
import { Gallery3D } from "@/features/visite/Gallery3D";

export const Route = createFileRoute("/etage/$num")({
  head: ({ params }) => ({
    meta: [
      { title: `Étage ${params.num} — Le Musée par Delanoche Paris` },
      { name: "description", content: `Visite 360° de l'étage ${params.num} : galerie immersive des maisons exposées.` },
    ],
  }),
  component: FloorPage,
});

const FLOORS: Record<string, { label: string; subtitle: string; open: boolean }> = {
  "1": { label: "Vêtements", subtitle: "Galerie des créateurs", open: true },
  "2": { label: "Art", subtitle: "En préparation", open: false },
  "3": { label: "Littérature", subtitle: "En préparation", open: false },
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

  return (
    <div className="min-h-screen bg-[#EDE9E1]">
      <MuseumHeader />
      <Gallery3D floor={num} />
    </div>
  );
}

