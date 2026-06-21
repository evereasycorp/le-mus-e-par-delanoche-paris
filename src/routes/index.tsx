import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock } from "lucide-react";
import hallHero from "@/assets/hall-hero.jpg";
import { MuseumHeader, SectionLabel } from "@/components/museum-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hall principal — Le Musée par Delanoche Paris" },
      { name: "description", content: "Entrez dans le Hall du Musée. Trois étages, trois disciplines : Vêtements, Art, Livres. Étage 1 ouvert." },
      { property: "og:title", content: "Le Musée par Delanoche Paris" },
      { property: "og:description", content: "Hall monumental, étages, expositions de créateurs." },
    ],
  }),
  component: Hall,
});

const FLOORS = [
  { num: 1, label: "Vêtements", subtitle: "Maisons, ateliers & couture", href: "/etage/1", open: true },
  { num: 2, label: "Art", subtitle: "Œuvres & galeries", href: "/etage/2", open: false },
  { num: 3, label: "Livres", subtitle: "Éditions & manuscrits", href: "/etage/3", open: false },
] as const;

function Hall() {
  return (
    <div className="min-h-screen">
      <MuseumHeader />

      {/* HERO */}
      <section className="relative h-[78vh] min-h-[560px] w-full overflow-hidden">
        <img
          src={hallHero}
          alt="Hall monumental du Musée"
          className="absolute inset-0 h-full w-full object-cover"
          width={1280}
          height={1600}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background" />
        <div className="vignette absolute inset-0" />

        <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-end px-6 pb-16 text-center fade-up">
          <p className="text-[10px] tracking-museum uppercase text-gold">
            Musée numérique &nbsp;·&nbsp; Réseau de créateurs
          </p>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-gold-soft sm:text-6xl">
            Le Musée
          </h1>
          <p className="mt-2 font-display text-2xl italic text-marble/85">par Delanoche Paris</p>
          <div className="mt-7 h-px w-24 bg-gold/60" />
          <p className="mt-7 max-w-md text-sm leading-relaxed text-muted-foreground">
            Trois étages, trois disciplines. Des portes derrière lesquelles chaque maison
            expose ses pièces comme des œuvres. Ici l'on découvre, on contemple, on collectionne.
          </p>
          <Link
            to="/etage/$num"
            params={{ num: "1" }}
            className="mt-9 inline-flex items-center gap-3 rounded-sm bg-gold px-6 py-3 text-[10px] tracking-room uppercase text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Monter à l'Étage 1
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* FLOORS */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="flex flex-col items-center text-center">
          <SectionLabel>Plan du Musée</SectionLabel>
          <h2 className="mt-4 font-display text-3xl text-foreground">Les trois étages</h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Seul l'Étage 1 est ouvert au public. Les étages supérieurs s'éveilleront bientôt.
          </p>
        </div>

        <ul className="mt-12 space-y-4">
          {FLOORS.map((f) => (
            <FloorRow key={f.num} {...f} />
          ))}
        </ul>
      </section>

      <footer className="border-t border-border/60 py-10 text-center">
        <p className="font-display text-sm text-gold-soft">Le Musée</p>
        <p className="mt-1 text-[10px] tracking-museum uppercase text-muted-foreground">
          Par Delanoche Paris · MMXXVI
        </p>
      </footer>
    </div>
  );
}

function FloorRow({
  num, label, subtitle, href, open,
}: { num: number; label: string; subtitle: string; href: string; open: boolean }) {
  const content = (
    <div className="gold-frame group relative flex items-center gap-5 overflow-hidden px-5 py-6 transition-all sm:px-8 sm:py-7">
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 shimmer-gold pointer-events-none" />
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-gold/40 font-display text-2xl text-gold">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-[10px] tracking-museum uppercase text-gold/70">Étage {num}</p>
        <h3 className="mt-1 font-display text-2xl text-foreground">{label}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {open ? (
        <ArrowUpRight className="h-5 w-5 shrink-0 text-gold transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : (
        <div className="flex flex-col items-end text-right">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="mt-1 text-[9px] tracking-room uppercase text-muted-foreground">
            Bientôt
          </span>
        </div>
      )}
    </div>
  );
  return open ? (
    <li><Link to={href}>{content}</Link></li>
  ) : (
    <li aria-disabled className="cursor-not-allowed opacity-70">{content}</li>
  );
}
