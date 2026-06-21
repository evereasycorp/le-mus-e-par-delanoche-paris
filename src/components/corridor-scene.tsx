import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { BadgePill, type BrandBadge } from "@/components/brand-badges";
import corridorImg from "@/assets/corridor.jpg";

/**
 * CorridorScene — parcours immersif type "travelling cinéma".
 *
 * Architecture en CALQUES (réutilisable pour V2 360°) :
 *  - backdropLayers : décors fixes/parallax (murs, dorures, sol)
 *  - items          : portes/objets interactifs ; la caméra avance sur Z
 *    en fonction du scroll ET des boutons haut/bas (navigation explicite).
 *
 * Règle d'affichage : UNE SEULE carte lisible/cliquable à la fois.
 * Navigation : scroll vertical OU flèches ↑ ↓ (toujours visibles).
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

// Hauteur de scroll allouée par transition entre 2 portes (en vh).
const SLOT_VH = 90;

export function CorridorScene({ items, header }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [activeSlot, setActiveSlot] = useState(1);
  const N = items.length;

  // Mapping ratio (0..1) → camera (1..N). Garantit qu'à scroll=0 la 1ère
  // porte est déjà visible (camera=1), et qu'en bas de section la dernière
  // porte est centrée (camera=N).
  useEffect(() => {
    const track = trackRef.current;
    const scene = sceneRef.current;
    if (!track || !scene) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const scrolled = -rect.top;
      const total = Math.max(1, rect.height - vh);
      const ratio = Math.max(0, Math.min(1, scrolled / total));
      const camera = N <= 1 ? 1 : 1 + ratio * (N - 1);
      scene.style.setProperty("--camera", camera.toFixed(4));
      scene.style.setProperty("--ratio", ratio.toFixed(4));
      setActiveSlot(Math.max(1, Math.min(N, Math.round(camera))));

      const nodes = scene.querySelectorAll<HTMLElement>("[data-slot]");
      nodes.forEach((node) => {
        const slot = Number(node.dataset.slot);
        const d = slot - camera; // <0 derrière, >0 devant
        const ad = Math.abs(d);

        // Scale : effet de profondeur (grossit en s'approchant)
        let scale: number;
        if (d >= 0) {
          const k = Math.max(0, 1 - d / 3);
          scale = 0.55 + k * 0.65; // 0.55 (loin) → 1.2 (devant)
        } else {
          const k = Math.min(1, -d / 0.8);
          scale = 1.2 + k * 1.0;
        }

        // Opacity : fenêtre tranchante autour de d=0
        const FADE_IN = 0.35;
        const FADE_OUT = 0.5;
        let opacity: number;
        if (ad <= FADE_IN) opacity = 1;
        else if (ad >= FADE_OUT) opacity = 0;
        else opacity = 1 - (ad - FADE_IN) / (FADE_OUT - FADE_IN);

        const z = opacity > 0 ? 100 - Math.round(ad * 100) : 0;
        node.style.setProperty("--s", scale.toFixed(3));
        node.style.setProperty("--o", opacity.toFixed(3));
        node.style.zIndex = String(z);
        node.style.pointerEvents = ad < 0.3 ? "auto" : "none";
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
  }, [N]);

  // Scroll programmatique vers un slot donné (1..N)
  const goToSlot = (slot: number) => {
    const track = trackRef.current;
    if (!track || N <= 1) return;
    const target = Math.max(1, Math.min(N, slot));
    const rect = track.getBoundingClientRect();
    const trackTop = rect.top + window.scrollY;
    const vh = window.innerHeight || 1;
    const total = Math.max(1, rect.height - vh);
    const ratio = (target - 1) / (N - 1);
    window.scrollTo({ top: trackTop + ratio * total, behavior: "smooth" });
  };

  return (
    <div
      ref={trackRef}
      className="relative w-full"
      style={{ height: `calc(${Math.max(1, N - 1) * SLOT_VH + 100}vh)` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        <div
          ref={sceneRef}
          className="relative h-full w-full"
          style={{ perspective: "1100px", perspectiveOrigin: "50% 45%" }}
        >
          <BackdropLayers />

          {header && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[200] px-5 pt-6 text-center">
              <div className="pointer-events-auto mx-auto max-w-md">{header}</div>
            </div>
          )}

          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {items.map((it, i) => (
              <CorridorDoor key={it.id} item={it} slot={i + 1} />
            ))}
          </div>

          {/* Flèches de navigation explicites (toujours visibles) */}
          <button
            type="button"
            onClick={() => goToSlot(activeSlot - 1)}
            disabled={activeSlot <= 1}
            aria-label="Porte précédente"
            className="group absolute left-1/2 top-20 z-[210] -translate-x-1/2 rounded-full border border-gold/40 bg-background/70 p-2 text-gold backdrop-blur-sm transition hover:bg-gold hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goToSlot(activeSlot + 1)}
            disabled={activeSlot >= N}
            aria-label="Porte suivante"
            className="group absolute left-1/2 bottom-16 z-[210] -translate-x-1/2 rounded-full border border-gold/40 bg-background/70 p-2 text-gold backdrop-blur-sm transition hover:bg-gold hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          {/* Indicateur de position */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[200] flex justify-center gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-4 transition-colors ${
                  i + 1 === activeSlot ? "bg-gold" : "bg-gold/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackdropLayers() {
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
      {layer(
        0.1,
        <img src={corridorImg} alt="" aria-hidden className="h-full w-full object-cover opacity-70" />,
      )}
      {layer(
        0.2,
        <div className="h-full w-full bg-gradient-to-b from-background/40 via-transparent to-background" />,
      )}
      {layer(
        0.45,
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="goldFade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
              <stop offset="55%" stopColor="var(--gold)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon points="0,100 100,100 65,55 35,55" fill="url(#goldFade)" opacity="0.15" />
          <polygon points="0,0 100,0 65,45 35,45" fill="url(#goldFade)" opacity="0.08" />
          <polygon points="0,0 35,45 35,55 0,100" fill="#000" opacity="0.55" />
          <polygon points="100,0 65,45 65,55 100,100" fill="#000" opacity="0.55" />
          <line x1="0" y1="0" x2="35" y2="45" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="0.2" />
          <line x1="100" y1="0" x2="65" y2="45" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="0.2" />
          <line x1="0" y1="100" x2="35" y2="55" stroke="var(--gold)" strokeOpacity="0.45" strokeWidth="0.25" />
          <line x1="100" y1="100" x2="65" y2="55" stroke="var(--gold)" strokeOpacity="0.45" strokeWidth="0.25" />
        </svg>,
      )}
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
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const handleEnter = (e: MouseEvent) => {
    e.preventDefault();
    if (opening) return;
    setOpening(true);
    // Durée totale ~780ms : fade carte (180ms) + ouverture battants (520ms) + push (80ms)
    window.setTimeout(() => {
      navigate({ to: "/salle/$slug", params: { slug: item.slug } });
    }, 720);
  };

  return (
    <div
      data-slot={slot}
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate3d(-50%, -50%, 0) scale(calc(var(--s, 0.6) * ${opening ? 1.18 : 1}))`,
        opacity: "var(--o, 0)",
        transformOrigin: "50% 55%",
        transition: "opacity 120ms linear, transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform, opacity",
      }}
    >
      <div className="relative w-[78vw] max-w-sm" style={{ perspective: "900px" }}>
        {/* Carte d'information (fade out à l'ouverture) */}
        <Link
          to="/salle/$slug"
          params={{ slug: item.slug }}
          onClick={handleEnter}
          className="gold-frame group relative block overflow-hidden bg-background/85 px-5 py-5 backdrop-blur-sm"
          style={{
            opacity: opening ? 0 : 1,
            transition: "opacity 180ms ease-out",
          }}
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

        {/* Battants de porte + halo lumineux (visibles uniquement à l'ouverture) */}
        {opening && (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ transformStyle: "preserve-3d" }}
            aria-hidden
          >
            {/* Halo lumineux derrière les battants */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, color-mix(in oklch, var(--gold) 55%, white) 0%, color-mix(in oklch, var(--gold) 30%, transparent) 35%, transparent 70%)",
                opacity: 0,
                animation: "doorLight 700ms ease-out forwards",
              }}
            />
            {/* Battant gauche */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 border border-gold/50 bg-background"
              style={{
                transformOrigin: "left center",
                background:
                  "linear-gradient(90deg, color-mix(in oklch, var(--gold) 18%, var(--background)) 0%, color-mix(in oklch, var(--gold) 5%, var(--background)) 100%)",
                animation: "doorLeftOpen 600ms cubic-bezier(0.65, 0, 0.35, 1) 120ms forwards",
                boxShadow: "inset -2px 0 0 color-mix(in oklch, var(--gold) 40%, transparent)",
              }}
            />
            {/* Battant droit */}
            <div
              className="absolute inset-y-0 right-0 w-1/2 border border-gold/50 bg-background"
              style={{
                transformOrigin: "right center",
                background:
                  "linear-gradient(270deg, color-mix(in oklch, var(--gold) 18%, var(--background)) 0%, color-mix(in oklch, var(--gold) 5%, var(--background)) 100%)",
                animation: "doorRightOpen 600ms cubic-bezier(0.65, 0, 0.35, 1) 120ms forwards",
                boxShadow: "inset 2px 0 0 color-mix(in oklch, var(--gold) 40%, transparent)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
