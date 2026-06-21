import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { BadgePill, type BrandBadge } from "@/components/brand-badges";
import corridorImg from "@/assets/corridor.jpg";

/**
 * CorridorScene — parcours immersif type "travelling cinéma".
 *
 * Architecture en CALQUES (réutilisable pour V2 360°) :
 *  - backdropLayers : décors fixes/parallax (murs, dorures, sol) — `depth` ∈ [0..1]
 *      où 0 = très loin (bouge peu), 1 = au plus près (bouge le plus en scroll).
 *  - items          : portes/objets interactifs, chacun avec un `slotIndex` qui
 *      définit son ancrage sur la "ligne de fuite" du couloir. La camera avance
 *      sur l'axe Z en fonction du scroll, et chaque item est rendu avec un
 *      scale/opacity dérivé de sa distance à la caméra (effet de profondeur CSS).
 *
 * V1 : scroll vertical = avancer.
 * V2 (préparée) : un futur `rotation` (drag horizontal) pourra simplement
 * appliquer une rotation Y aux calques sans changer la structure DOM.
 */

export type CorridorItem = {
  id: string;
  slug: string;
  rank: number;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  level: number;
  badges: BrandBadge[];
};

type Props = {
  items: CorridorItem[];
  header?: ReactNode;
};

// Hauteur de scroll allouée par item (en vh). Plus grand = travelling plus lent.
const SLOT_VH = 90;

export function CorridorScene({ items, header }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Scroll-linked animation via CSS variables + rAF. Pas de re-render React.
  useEffect(() => {
    const track = trackRef.current;
    const scene = sceneRef.current;
    if (!track || !scene) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // progress global 0..items.length (caméra Z en "slots")
      const scrolled = -rect.top;
      const total = rect.height - vh;
      const ratio = Math.max(0, Math.min(1, scrolled / Math.max(1, total)));
      const camera = ratio * items.length;
      scene.style.setProperty("--camera", camera.toFixed(4));
      scene.style.setProperty("--ratio", ratio.toFixed(4));

      // chaque item : distance signée à la caméra
      // Règle : UNE SEULE carte lisible à la fois. Les voisines sont déjà
      // entièrement transparentes (opacity 0) avant que l'active n'arrive.
      // Fenêtre de lisibilité : |d| < 0.5 ; au-delà, opacity = 0.
      const nodes = scene.querySelectorAll<HTMLElement>("[data-slot]");
      nodes.forEach((node) => {
        const slot = Number(node.dataset.slot);
        const d = slot - camera; // <0 derrière nous, >0 devant
        const ad = Math.abs(d);

        // Scale : effet de profondeur conservé (grandit en s'approchant,
        // continue à grandir en dépassant la caméra).
        let scale: number;
        if (d >= 0) {
          const k = Math.max(0, 1 - d / 3);
          scale = 0.5 + k * 0.7; // loin 0.5 → devant 1.2
        } else {
          const k = Math.min(1, -d / 0.8);
          scale = 1.2 + k * 1.2;
        }

        // Opacity : fenêtre étroite et tranchante autour de d=0.
        // d=0 → 1, |d|=0.35 → 1, |d|>=0.5 → 0. Aucun chevauchement lisible.
        const FADE_IN = 0.35;
        const FADE_OUT = 0.5;
        let opacity: number;
        if (ad <= FADE_IN) {
          opacity = 1;
        } else if (ad >= FADE_OUT) {
          opacity = 0;
        } else {
          opacity = 1 - (ad - FADE_IN) / (FADE_OUT - FADE_IN);
        }

        // z-index : la carte la plus proche est toujours au premier plan.
        // Les inactives (opacity 0) reculent loin derrière pour ne jamais
        // intercepter le clic ni masquer l'active.
        const z = opacity > 0 ? 100 - Math.round(ad * 100) : 0;

        node.style.setProperty("--s", scale.toFixed(3));
        node.style.setProperty("--o", opacity.toFixed(3));
        node.style.zIndex = String(z);
        // Cliquable uniquement quand cette carte est l'active dominante.
        node.style.pointerEvents = ad < 0.3 ? "auto" : "none";
        // visibility:hidden quand totalement transparente → 0 risque de
        // capter un clic ou de laisser un fantôme lisible.
        node.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
      });
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length]);

  return (
    <div
      ref={trackRef}
      className="relative w-full"
      style={{ height: `calc(${items.length * SLOT_VH + 60}vh)` }}
    >
      {/* Viewport sticky : la "caméra" */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        <div
          ref={sceneRef}
          className="relative h-full w-full"
          style={{
            perspective: "1100px",
            perspectiveOrigin: "50% 45%",
          }}
        >
          {/* === CALQUES DE DÉCOR (parallax) === */}
          <BackdropLayers />

          {/* === EN-TÊTE flottant === */}
          {header && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[200] px-5 pt-6 text-center">
              <div className="pointer-events-auto mx-auto max-w-md">{header}</div>
            </div>
          )}

          {/* === PORTES (items) === */}
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {items.map((it, i) => (
              <CorridorDoor key={it.id} item={it} slot={i + 1} />
            ))}
          </div>

          {/* Indicateur de scroll */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-1 text-[10px] tracking-room uppercase text-gold/60">
            <span>Avancer dans le couloir</span>
            <span className="h-6 w-px animate-pulse bg-gold/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BackdropLayers() {
  // Plusieurs couches parallax. `--ratio` ∈ [0..1] vient du scroll.
  // translateY négatif quand on avance → impression que le décor recule.
  const layer = (depth: number, children: ReactNode, extra?: string) => (
    <div
      className={`absolute inset-0 ${extra ?? ""}`}
      style={{
        transform: `translate3d(0, calc(var(--ratio, 0) * ${-depth * 40}px), 0) scale(${1 + depth * 0.05})`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Fond couloir profond */}
      {layer(
        0.1,
        <img
          src={corridorImg}
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-70"
        />,
      )}
      {/* Vignette + voile nuit */}
      {layer(
        0.2,
        <div className="h-full w-full bg-gradient-to-b from-background/40 via-transparent to-background" />,
      )}
      {/* Lignes de fuite dorées (murs latéraux) */}
      {layer(
        0.45,
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="goldFade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
              <stop offset="55%" stopColor="var(--gold)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* sol */}
          <polygon points="0,100 100,100 65,55 35,55" fill="url(#goldFade)" opacity="0.15" />
          {/* plafond */}
          <polygon points="0,0 100,0 65,45 35,45" fill="url(#goldFade)" opacity="0.08" />
          {/* mur gauche */}
          <polygon points="0,0 35,45 35,55 0,100" fill="#000" opacity="0.55" />
          {/* mur droit */}
          <polygon points="100,0 65,45 65,55 100,100" fill="#000" opacity="0.55" />
          {/* moulures dorées */}
          <line x1="0" y1="0" x2="35" y2="45" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="0.2" />
          <line x1="100" y1="0" x2="65" y2="45" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="0.2" />
          <line x1="0" y1="100" x2="35" y2="55" stroke="var(--gold)" strokeOpacity="0.45" strokeWidth="0.25" />
          <line x1="100" y1="100" x2="65" y2="55" stroke="var(--gold)" strokeOpacity="0.45" strokeWidth="0.25" />
        </svg>,
      )}
      {/* halo central */}
      {layer(
        0.6,
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(ellipse 40% 30% at 50% 50%, color-mix(in oklch, var(--gold) 18%, transparent), transparent 70%)",
          }}
        />,
      )}
    </div>
  );
}

function CorridorDoor({ item, slot }: { item: CorridorItem; slot: number }) {
  return (
    <div
      data-slot={slot}
      className="absolute left-1/2 top-1/2"
      style={{
        // s et o sont pilotés par le scroll
        transform:
          "translate3d(-50%, -50%, 0) scale(var(--s, 0.5))",
        opacity: "var(--o, 0)",
        transformOrigin: "50% 55%",
        transition: "opacity 120ms linear",
        willChange: "transform, opacity",
      }}
    >
      <Link
        to="/salle/$slug"
        params={{ slug: item.slug }}
        className="gold-frame group relative block w-[78vw] max-w-sm overflow-hidden bg-background/85 px-5 py-5 backdrop-blur-sm"
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 shimmer-gold" />

        <div className="flex items-baseline justify-between">
          <span className="text-[10px] tracking-room uppercase text-gold/80">
            Porte N° {String(item.rank).padStart(2, "0")}
          </span>
          <span className="text-[10px] tracking-room uppercase text-muted-foreground">
            Niv. {item.level}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-gold/40 bg-background/60 font-display text-2xl text-gold">
            {item.logoUrl ? (
              <img src={item.logoUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              item.name.charAt(0)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-2xl text-gold-soft">{item.name}</h3>
            {item.tagline && (
              <p className="truncate text-xs text-muted-foreground">{item.tagline}</p>
            )}
          </div>
        </div>

        {item.badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.badges.slice(0, 4).map((bd) => (
              <BadgePill key={bd.slug} badge={bd} />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-gold/20 pt-3">
          <span className="text-[10px] tracking-room uppercase text-gold">Entrer dans la salle</span>
          <ArrowUpRight className="h-4 w-4 text-gold transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>
    </div>
  );
}
