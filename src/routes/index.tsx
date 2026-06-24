import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock, Instagram, Facebook, Youtube, Linkedin } from "lucide-react";
// PLACEHOLDER : remplacer par l'image du Sceau (fontaine bronze, motif ovale "DD")
// dès que l'asset sera disponible dans src/assets/.
import hallHero from "@/assets/hall-hero.jpg";
import logoMusee from "@/assets/logo-musee.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Le Musée par Delanoche Paris — Exposez votre marque" },
      {
        name: "description",
        content:
          "Un musée numérique parisien où chaque marque expose ses créations comme des œuvres. Parcours immersif 360°, trois étages, sélection exigeante.",
      },
      { property: "og:title", content: "Le Musée par Delanoche Paris" },
      {
        property: "og:description",
        content:
          "Votre marque mérite mieux qu'une boutique en ligne. Exposez vos créations dans un musée immersif 360°.",
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
    <div className="min-h-screen bg-[color:var(--museum-black)] text-[color:var(--ivory)]">
      {/* Header sombre — logo complet + CTA exposant */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--bronze)]/25 bg-[color:var(--museum-black)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
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
              className="h-12 w-12 object-contain sm:h-14 sm:w-14"
            />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-lg text-[color:var(--ivory)]">Le Musée</span>
              <span className="font-sans text-[9px] tracking-museum text-[color:var(--bronze)] uppercase mt-1">
                par Delanoche Paris
              </span>
            </span>
          </Link>
          <Link
            to="/etage/$num"
            params={{ num: "1" }}
            search={{ becomeExposant: "1" } as never}
            className="inline-flex items-center gap-2 rounded-sm bg-[color:var(--bronze)] px-3 py-2.5 text-[10px] font-medium tracking-room uppercase text-[color:var(--museum-black)] transition-transform hover:scale-[1.02] sm:px-5 sm:py-3"
          >
            Devenir exposant
          </Link>
        </div>
      </header>

      {/* HERO — galerie nocturne, Sceau en arrière-plan */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${hallHero})` }}
        />
        {/* Vignette + overlay noir-musée */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[color:var(--museum-black)]/82"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 40%, rgba(11,10,8,0.55) 0%, rgba(11,10,8,0.92) 70%, rgba(11,10,8,0.98) 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-32 lg:py-40">
          <p className="text-[10px] tracking-museum uppercase text-[color:var(--bronze)]">
            <span className="inline-block h-px w-6 align-middle bg-[color:var(--bronze)]/70 mr-3" />
            Le Musée par Delanoche Paris
            <span className="inline-block h-px w-6 align-middle bg-[color:var(--bronze)]/70 ml-3" />
          </p>

          <h1 className="mt-8 font-display text-4xl leading-[1.05] text-[color:var(--ivory)] sm:text-6xl lg:text-7xl">
            Votre marque mérite mieux
            <span className="block italic text-[color:var(--bronze)]">qu'une boutique en ligne.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-[color:var(--ivory)]/75 sm:text-lg">
            Un musée numérique où chaque maison expose ses créations comme des œuvres, dans un
            parcours immersif à 360°. Ici, on construit une réputation — on ne vend pas, on se
            laisse découvrir.
          </p>

          <div className="mt-12 flex flex-col items-center gap-5">
            <Link
              to="/etage/$num"
              params={{ num: "1" }}
              className="group inline-flex items-center gap-3 rounded-sm bg-[color:var(--bronze)] px-8 py-4 text-[11px] font-medium tracking-room uppercase text-[color:var(--museum-black)] shadow-[0_20px_50px_-20px_rgba(176,141,87,0.6)] transition-transform hover:scale-[1.02]"
            >
              Exposer ma marque — c'est gratuit
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/etage/$num"
              params={{ num: "1" }}
              className="text-[11px] tracking-room uppercase text-[color:var(--ivory)]/70 underline underline-offset-4 decoration-[color:var(--bronze)]/50 hover:text-[color:var(--bronze)] transition-colors"
            >
              Découvrir le musée en visiteur
            </Link>
          </div>

          <div className="mt-16 flex items-center gap-5 text-[10px] tracking-museum uppercase text-[color:var(--ivory)]/55">
            <span>Visite 360°</span>
            <span className="h-px w-8 bg-[color:var(--bronze)]/60" />
            <span>3 étages</span>
            <span className="h-px w-8 bg-[color:var(--bronze)]/60" />
            <span>Sélection exigeante</span>
          </div>
        </div>
      </section>

      {/* À propos */}
      <section
        id="a-propos"
        className="border-y border-[color:var(--bronze)]/15 bg-[color:var(--museum-black)]"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-24 md:grid-cols-3">
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
              t: "Réputation patrimoniale",
              d: "Chaque pièce raconte une histoire ; chaque visite construit la mémoire de la marque.",
            },
          ].map((b) => (
            <div key={b.k}>
              <p className="font-display text-2xl text-[color:var(--bronze)]">{b.k}</p>
              <div className="mt-3 h-px w-10 bg-[color:var(--bronze)]/60" />
              <h3 className="mt-5 font-display text-xl text-[color:var(--ivory)]">{b.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--ivory)]/65">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Étages */}
      <section id="etages" className="mx-auto max-w-5xl px-6 py-24">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 text-[10px] tracking-museum uppercase text-[color:var(--bronze)]">
            <span className="h-px w-6 bg-[color:var(--bronze)]/60" />
            Plan du Musée
            <span className="h-px w-6 bg-[color:var(--bronze)]/60" />
          </div>
          <h2 className="mt-5 font-display text-4xl text-[color:var(--ivory)]">Les trois étages</h2>
          <p className="mt-4 max-w-md text-sm text-[color:var(--ivory)]/65">
            Seul l'Étage 1 est ouvert au public. Les étages supérieurs s'éveilleront bientôt.
          </p>
        </div>

        <ul className="mt-14 space-y-5">
          {FLOORS.map((f) => (
            <FloorRow key={f.num} {...f} />
          ))}
        </ul>
      </section>

      {/* Footer sombre */}
      <footer className="border-t border-[color:var(--bronze)]/20 bg-[color:var(--museum-black)]">
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
                <p className="font-display text-lg text-[color:var(--ivory)]">Le Musée</p>
                <p className="text-[10px] tracking-museum uppercase text-[color:var(--bronze)]">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--bronze)]/40 text-[color:var(--ivory)]/75 transition-colors hover:border-[color:var(--bronze)] hover:bg-[color:var(--bronze)] hover:text-[color:var(--museum-black)]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[color:var(--bronze)]/15 pt-6 text-[10px] tracking-museum uppercase text-[color:var(--ivory)]/55 sm:flex-row">
            <p>© MMXXVI — Delanoche Paris</p>
            <Link
              to="/admin-login"
              className="hover:text-[color:var(--bronze)] transition-colors"
            >
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
    <div className="group relative flex items-center gap-6 overflow-hidden border border-[color:var(--bronze)]/25 bg-[color:var(--museum-black)] px-6 py-7 transition-all hover:border-[color:var(--bronze)] hover:shadow-[0_20px_50px_-25px_rgba(176,141,87,0.35)] sm:px-10 sm:py-8">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[color:var(--bronze)]/50 font-display text-3xl text-[color:var(--bronze)]">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-[10px] tracking-museum uppercase text-[color:var(--bronze)]/80">
          Étage {num}
        </p>
        <h3 className="mt-1 font-display text-2xl text-[color:var(--ivory)]">{label}</h3>
        <p className="text-xs text-[color:var(--ivory)]/60">{subtitle}</p>
      </div>
      {open ? (
        <ArrowUpRight className="h-5 w-5 shrink-0 text-[color:var(--bronze)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      ) : (
        <div className="flex flex-col items-end text-right">
          <Lock className="h-4 w-4 text-[color:var(--ivory)]/55" />
          <span className="mt-1 text-[9px] tracking-room uppercase text-[color:var(--ivory)]/55">
            Bientôt
          </span>
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
