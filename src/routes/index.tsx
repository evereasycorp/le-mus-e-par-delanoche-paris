import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
import hallBright from "@/assets/hall-bright.jpg";
import logoMusee from "@/assets/logo-musee.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Le Musée par Delanoche Paris — Maisons, Art & Littérature" },
      {
        name: "description",
        content:
          "Un musée numérique parisien. Trois étages, trois disciplines : Vêtements, Art, Littérature. Visite immersive 360° de l'Étage 1.",
      },
      { property: "og:title", content: "Le Musée par Delanoche Paris" },
      {
        property: "og:description",
        content:
          "Visite immersive d'un musée parisien dédié aux maisons de couture, à l'art et à la littérature.",
      },
    ],
  }),
  component: Hall,
});

const FLOORS = [
  {
    num: 1,
    label: "Vêtements",
    subtitle: "Maisons, ateliers & couture",
    href: "/etage/1",
    open: true,
  },
  { num: 2, label: "Art", subtitle: "Œuvres & galeries", href: "/etage/2", open: false },
  {
    num: 3,
    label: "Littérature",
    subtitle: "Éditions & manuscrits",
    href: "/etage/3",
    open: false,
  },
] as const;

const SOCIALS = [
  { Icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { Icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { Icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { Icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
] as const;

function Hall() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Header clair avec logo */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--gold)]/30 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label="Le Musée par Delanoche Paris"
          >
            <img
              src={logoMusee}
              alt="Le Musée par Delanoche Paris"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-lg text-ink">Le Musée</span>
              <span className="font-sans text-[9px] tracking-museum text-ink-soft uppercase mt-1">
                par Delanoche Paris
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-[11px] tracking-room uppercase text-ink-soft">
            <a
              href="#etages"
              className="hidden sm:inline-block hover:text-[color:var(--gold)] transition-colors"
            >
              Les étages
            </a>
            <a
              href="#a-propos"
              className="hidden sm:inline-block hover:text-[color:var(--gold)] transition-colors"
            >
              À propos
            </a>
            <Link
              to="/etage/$num"
              params={{ num: "1" }}
              className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--gold)] bg-[color:var(--gold)] px-4 py-2 text-[10px] tracking-room uppercase text-primary-foreground transition-colors hover:bg-transparent hover:text-[color:var(--gold)]"
            >
              Visiter
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO clair, lumineux */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="fade-up">
            <p className="text-[10px] tracking-museum uppercase text-[color:var(--gold)]">
              Musée numérique &nbsp;·&nbsp; Réseau de créateurs
            </p>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
              Un musée parisien,
              <span className="block italic text-[color:var(--gold)]">à ciel ouvert.</span>
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-ink-soft">
              Trois étages, trois disciplines. Derrière chaque porte, une maison expose ses pièces
              comme des œuvres. Ici l'on découvre, on contemple, on collectionne.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/etage/$num"
                params={{ num: "1" }}
                className="inline-flex items-center gap-3 rounded-sm bg-ink px-7 py-3.5 text-[11px] tracking-room uppercase text-cream transition-transform hover:scale-[1.02]"
              >
                Commencer la visite
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="#etages"
                className="inline-flex items-center gap-3 rounded-sm border border-ink/20 px-6 py-3.5 text-[11px] tracking-room uppercase text-ink hover:border-[color:var(--gold)] hover:text-[color:var(--gold)] transition-colors"
              >
                Découvrir les étages
              </a>
            </div>
            <div className="mt-12 flex items-center gap-6 text-[10px] tracking-museum uppercase text-ink-soft">
              <span>Visite 360°</span>
              <span className="h-px w-8 bg-[color:var(--gold)]/60" />
              <span>3 étages</span>
              <span className="h-px w-8 bg-[color:var(--gold)]/60" />
              <span>Créateurs sélectionnés</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[color:var(--gold)]/20 via-transparent to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-sm border border-[color:var(--gold)]/30 shadow-[0_30px_80px_-30px_rgba(120,90,40,0.35)]">
              <img
                src={hallBright}
                alt="Galerie monumentale du Musée par Delanoche Paris"
                className="h-[520px] w-full object-cover lg:h-[640px]"
                width={1536}
                height={1024}
              />
            </div>
          </div>
        </div>
      </section>

      {/* À propos */}
      <section id="a-propos" className="border-y border-[color:var(--gold)]/20 bg-marble/60">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3">
          {[
            {
              k: "01",
              t: "Un écrin numérique",
              d: "Une scénographie immersive 360° qui restitue la noblesse d'un musée parisien.",
            },
            {
              k: "02",
              t: "Maisons sélectionnées",
              d: "Des créateurs choisis avec exigence, présentés comme dans une exposition permanente.",
            },
            {
              k: "03",
              t: "Acquérir une œuvre",
              d: "Chaque pièce peut être commandée directement, dans la continuité de la visite.",
            },
          ].map((b) => (
            <div key={b.k}>
              <p className="font-display text-2xl text-[color:var(--gold)]">{b.k}</p>
              <div className="mt-3 h-px w-10 bg-[color:var(--gold)]/60" />
              <h3 className="mt-5 font-display text-xl text-ink">{b.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Étages */}
      <section id="etages" className="mx-auto max-w-5xl px-6 py-24">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 text-[10px] tracking-museum uppercase text-[color:var(--gold)]">
            <span className="h-px w-6 bg-[color:var(--gold)]/60" />
            Plan du Musée
            <span className="h-px w-6 bg-[color:var(--gold)]/60" />
          </div>
          <h2 className="mt-5 font-display text-4xl text-ink">Les trois étages</h2>
          <p className="mt-4 max-w-md text-sm text-ink-soft">
            Seul l'Étage 1 est ouvert au public. Les étages supérieurs s'éveilleront bientôt.
          </p>
        </div>

        <ul className="mt-14 space-y-5">
          {FLOORS.map((f) => (
            <FloorRow key={f.num} {...f} />
          ))}
        </ul>
      </section>

      {/* Footer clair avec réseaux sociaux */}
      <footer className="border-t border-[color:var(--gold)]/25 bg-marble">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={logoMusee}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <div className="leading-tight">
                <p className="font-display text-lg text-ink">Le Musée</p>
                <p className="text-[10px] tracking-museum uppercase text-ink-soft">
                  par Delanoche Paris
                </p>
              </div>
            </div>

            <nav aria-label="Réseaux sociaux" className="flex items-center gap-3">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--gold)]/40 text-ink-soft transition-colors hover:border-[color:var(--gold)] hover:bg-[color:var(--gold)] hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[color:var(--gold)]/15 pt-6 text-[10px] tracking-museum uppercase text-ink-soft sm:flex-row">
            <p>© MMXXVI — Delanoche Paris</p>
            <Link to="/admin-login" className="hover:text-[color:var(--gold)] transition-colors">
              Espace conservateur
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FloorRow({
  num,
  label,
  subtitle,
  href,
  open,
}: {
  num: number;
  label: string;
  subtitle: string;
  href: string;
  open: boolean;
}) {
  const content = (
    <div className="group relative flex items-center gap-6 overflow-hidden border border-[color:var(--gold)]/25 bg-cream px-6 py-7 transition-all hover:border-[color:var(--gold)] hover:shadow-[0_20px_50px_-25px_rgba(120,90,40,0.25)] sm:px-10 sm:py-8">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[color:var(--gold)]/50 font-display text-3xl text-[color:var(--gold)]">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-[10px] tracking-museum uppercase text-[color:var(--gold)]/80">
          Étage {num}
        </p>
        <h3 className="mt-1 font-display text-2xl text-ink">{label}</h3>
        <p className="text-xs text-ink-soft">{subtitle}</p>
      </div>
      {open ? (
        <ArrowUpRight className="h-5 w-5 shrink-0 text-[color:var(--gold)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : (
        <div className="flex flex-col items-end text-right">
          <Lock className="h-4 w-4 text-ink-soft" />
          <span className="mt-1 text-[9px] tracking-room uppercase text-ink-soft">Bientôt</span>
        </div>
      )}
    </div>
  );
  return open ? (
    <li>
      <Link to={href}>{content}</Link>
    </li>
  ) : (
    <li aria-disabled className="cursor-not-allowed opacity-70">
      {content}
    </li>
  );
}
