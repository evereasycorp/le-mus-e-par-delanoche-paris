import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import "pannellum/build/pannellum.css";
import "pannellum/build/pannellum.js";
import { resolvePanoramaUrl } from "./panoramas";
import type { Hotspot, Room, BrandLite, PieceLite } from "./types";

// Minimal typing for the global pannellum API we use.
type PannellumHotSpot = {
  pitch: number;
  yaw: number;
  type: "scene" | "info";
  text?: string;
  sceneId?: string;
  cssClass?: string;
  targetYaw?: number;
  targetPitch?: number;
  targetHfov?: number;
  clickHandlerFunc?: () => void;
};

type PannellumScene = {
  type: "equirectangular";
  panorama: string;
  hfov?: number;
  yaw?: number;
  pitch?: number;
  minHfov?: number;
  maxHfov?: number;
  friction?: number;
  autoLoad?: boolean;
  showZoomCtrl?: boolean;
  showFullscreenCtrl?: boolean;
  showControls?: boolean;
  hotSpots?: PannellumHotSpot[];
};

type PannellumViewerInstance = {
  destroy: () => void;
  loadScene: (id: string, pitch?: number | "same", yaw?: number | "same", hfov?: number | "same") => void;
  setHfov: (n: number) => void;
  getHfov: () => number;
  getYaw?: () => number;
  getPitch?: () => number;
  getScene?: () => string;
  on: (ev: string, cb: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    pannellum?: {
      viewer: (
        el: HTMLElement | string,
        config: {
          default: {
            firstScene: string;
            sceneFadeDuration?: number;
            autoLoad?: boolean;
            hfov?: number;
            minHfov?: number;
            maxHfov?: number;
            friction?: number;
          };
          scenes: Record<string, PannellumScene>;
        },
      ) => PannellumViewerInstance;
    };
  }
}

export type PannellumViewerHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
};

// --- Tuning constants -------------------------------------------------------
// More human-like field of view: less fisheye distortion.
const DEFAULT_HFOV = 75;
const MIN_HFOV = 45;   // Plus de zoom avant
const MAX_HFOV = 95;   // Moins de zoom arrière (réduit l'effet grand-angle)
const SCENE_FADE = 900;

// Floor pitch for navigation arrows (looking down at the ground in front).
const FLOOR_PITCH = -34;
// Door arrows: more realistic perspective — wider near the camera, narrower
// deeper in the corridor. Pairs left/right alternating.
const DOOR_PAIR_YAWS = [55, 30, 18, 12];

// Virtual scene id for the upper landing (top of the staircase). Reuses the
// entrance panorama but with a different framing to simulate progression.
const LANDING_SCENE_ID = "__entrance_landing";

export function PannellumViewer({
  rooms,
  hotspots,
  brands,
  activeBrandId,
  activeBrandPieces,
  currentRoomId,
  onChangeRoom,
  onOpenGarment,
  onOpenBrand,
  onSelectBrand,
  viewerRef,
}: {
  rooms: Room[];
  hotspots: Hotspot[];
  brands: BrandLite[];
  activeBrandId: string | null;
  activeBrandPieces: PieceLite[];
  currentRoomId: string | null;
  onChangeRoom: (roomId: string) => void;
  onOpenGarment: (pieceId: string) => void;
  onOpenBrand: (brandId: string) => void;
  onSelectBrand: (brandId: string) => void;
  viewerRef?: React.MutableRefObject<PannellumViewerHandle | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<PannellumViewerInstance | null>(null);

  const cbRef = useRef({ onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand });
  cbRef.current = { onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand };

  const liveRef = useRef({ activeBrandId, activeBrandPieces, brands, rooms });
  liveRef.current = { activeBrandId, activeBrandPieces, brands, rooms };

  const salleRoom = useMemo(() => rooms.find((r) => r.kind === "salle"), [rooms]);
  const entranceRoom = useMemo(() => rooms.find((r) => r.kind === "entrance"), [rooms]);
  const corridorRoom = useMemo(() => rooms.find((r) => r.kind === "corridor"), [rooms]);

  // Smooth cinematographic scene transition (dolly-zoom-in feel + fade).
  const goToScene = (sceneId: string, targetYaw = 0, targetPitch = 0) => {
    const v = instanceRef.current;
    if (!v) return;
    const startHfov = v.getHfov();
    const endHfov = 52;
    const duration = 520;
    const t0 = performance.now();
    const step = (now: number) => {
      const v2 = instanceRef.current;
      if (!v2) return;
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      try { v2.setHfov(startHfov + (endHfov - startHfov) * e); } catch { /* ignore */ }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        try { v2.loadScene(sceneId, targetPitch, targetYaw, DEFAULT_HFOV); } catch { /* ignore */ }
      }
    };
    requestAnimationFrame(step);
  };

  const showSoon = (label: string) => {
    toast(`${label} — cette aile du musée ouvrira prochainement.`, {
      duration: 3200,
      className: "font-sans",
    });
  };

  const config = useMemo(() => {
    if (rooms.length === 0) return null;
    const scenes: Record<string, PannellumScene> = {};

    const slugOf = (r: Room | undefined) => (r ? r.slug ?? r.id : undefined);
    const entranceSlug = slugOf(entranceRoom);
    const corridorSlug = slugOf(corridorRoom);
    const salleSlug = slugOf(salleRoom);

    const baseScene = (panoramaUrl: string): PannellumScene => ({
      type: "equirectangular",
      panorama: resolvePanoramaUrl(panoramaUrl),
      hfov: DEFAULT_HFOV,
      minHfov: MIN_HFOV,
      maxHfov: MAX_HFOV,
      friction: 0.18,
      yaw: 0,
      pitch: 0,
      autoLoad: true,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      showControls: false,
    });

    for (const room of rooms) {
      const sceneId = room.slug ?? room.id;
      const roomHotspots = hotspots.filter((h) => h.room_id === room.id);
      const hs: PannellumHotSpot[] = [];

      // ===== HALL D'ENTRÉE — ground floor =====
      if (room.kind === "entrance") {
        // 1) Pied de l'escalier — monter
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow",
          text: "Monter l'escalier",
          clickHandlerFunc: () => goToScene(LANDING_SCENE_ID, 0, 0),
        });
        // 2) Aile gauche — Art (à venir)
        hs.push({
          type: "info",
          pitch: -14,
          yaw: -92,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-soon",
          text: "Aile Art",
          clickHandlerFunc: () => showSoon("Aile Art"),
        });
        // 3) Aile droite — Littérature (à venir)
        hs.push({
          type: "info",
          pitch: -14,
          yaw: 92,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-soon",
          text: "Aile Littérature",
          clickHandlerFunc: () => showSoon("Aile Littérature"),
        });
      }

      // ===== COULOIR DES CRÉATEURS =====
      if (room.kind === "corridor") {
        // Retour vers le palier (haut de l'escalier).
        if (entranceSlug) {
          hs.push({
            type: "info",
            pitch: FLOOR_PITCH,
            yaw: 180,
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
            text: "Retour au palier",
            clickHandlerFunc: () => goToScene(LANDING_SCENE_ID, 180, 0),
          });
        }
        // Flèche centrale "avancer" — petit effet d'avancée (dolly zoom).
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH + 6,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-forward",
          text: "Avancer dans le couloir",
          clickHandlerFunc: () => {
            const v = instanceRef.current;
            if (!v) return;
            // Petite avancée optique — réduit le fov pour simuler un pas en avant.
            const startHfov = v.getHfov();
            const endHfov = Math.max(MIN_HFOV + 5, startHfov - 14);
            const t0 = performance.now();
            const dur = 600;
            const step = (now: number) => {
              const t = Math.min(1, (now - t0) / dur);
              const e = 1 - Math.pow(1 - t, 3);
              try { v.setHfov(startHfov + (endHfov - startHfov) * e); } catch { /* ignore */ }
              if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          },
        });
        // Une flèche par porte de créateur, alignée devant l'ouverture.
        if (salleSlug) {
          brands.forEach((b, i) => {
            const pairIndex = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1;
            const baseYaw = DOOR_PAIR_YAWS[pairIndex] ?? 8;
            const doorYaw = side * baseYaw;
            hs.push({
              type: "info",
              pitch: FLOOR_PITCH,
              yaw: doorYaw,
              cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow",
              text: b.name,
              clickHandlerFunc: () => {
                cbRef.current.onSelectBrand(b.id);
                goToScene(salleSlug, 0, 0);
              },
            });
          });
        }
      }

      // ===== SALLE =====
      if (room.kind === "salle" && corridorSlug) {
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH,
          yaw: 180,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
          text: "Retour au couloir",
          clickHandlerFunc: () => goToScene(corridorSlug, 0, 0),
        });
      }

      // ----- Existing in-room info hotspots (garment / brand wall) -----
      for (const h of roomHotspots) {
        if (h.type === "nav") continue;
        if (room.kind === "salle" && h.type === "garmentInfo") {
          const idx = h.slot_index ?? 0;
          hs.push({
            type: "info",
            yaw: h.yaw,
            pitch: h.pitch,
            text: "Pièce",
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-garment",
            clickHandlerFunc: () => {
              const piece = liveRef.current.activeBrandPieces[idx];
              if (piece) cbRef.current.onOpenGarment(piece.id);
            },
          });
        } else if (room.kind === "salle" && h.type === "brandWall") {
          hs.push({
            type: "info",
            yaw: h.yaw,
            pitch: h.pitch,
            text: "Identité de la maison",
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-wall",
            clickHandlerFunc: () => {
              const id = liveRef.current.activeBrandId;
              if (id) cbRef.current.onOpenBrand(id);
            },
          });
        }
      }

      scenes[sceneId] = {
        ...baseScene(room.panorama_url),
        hotSpots: hs,
      };
    }

    // ===== Scène virtuelle "Palier" (haut de l'escalier) =====
    if (entranceRoom && corridorSlug && entranceSlug) {
      const landingHs: PannellumHotSpot[] = [
        {
          type: "info",
          pitch: FLOOR_PITCH + 2,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow",
          text: "Entrer dans le couloir des créateurs",
          clickHandlerFunc: () => goToScene(corridorSlug, 0, 0),
        },
        {
          type: "info",
          pitch: FLOOR_PITCH,
          yaw: 180,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
          text: "Redescendre dans le hall",
          clickHandlerFunc: () => goToScene(entranceSlug, 0, 0),
        },
      ];
      scenes[LANDING_SCENE_ID] = {
        ...baseScene(entranceRoom.panorama_url),
        // Cadrage légèrement plus serré, vue depuis le haut de l'escalier.
        hfov: 68,
        pitch: 4,
        yaw: 0,
        hotSpots: landingHs,
      };
    }

    const firstRoom =
      rooms.find((r) => r.kind === "entrance") ??
      rooms.find((r) => r.kind === "corridor") ??
      rooms[0];
    const firstScene = firstRoom?.slug ?? firstRoom?.id ?? Object.keys(scenes)[0];

    return {
      default: {
        firstScene,
        sceneFadeDuration: SCENE_FADE,
        autoLoad: true,
        hfov: DEFAULT_HFOV,
        minHfov: MIN_HFOV,
        maxHfov: MAX_HFOV,
        friction: 0.18,
      },
      scenes,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, hotspots, brands, entranceRoom, corridorRoom, salleRoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !config || !window.pannellum) return;
    const viewer = window.pannellum.viewer(el, config);
    instanceRef.current = viewer;
    viewer.on("scenechange", (...args: unknown[]) => {
      const sceneId = String(args[0] ?? "");
      // Le palier virtuel renvoie sur la room "entrance" pour l'état HUD.
      const resolvedId = sceneId === LANDING_SCENE_ID ? (entranceRoom?.slug ?? entranceRoom?.id ?? sceneId) : sceneId;
      const room = rooms.find((r) => (r.slug ?? r.id) === resolvedId);
      if (room) cbRef.current.onChangeRoom(room.id);
    });
    if (viewerRef) {
      viewerRef.current = {
        zoomIn: () => viewer.setHfov(Math.max(MIN_HFOV, viewer.getHfov() - 6)),
        zoomOut: () => viewer.setHfov(Math.min(MAX_HFOV, viewer.getHfov() + 6)),
      };
    }
    return () => {
      try { viewer.destroy(); } catch { /* ignore */ }
      instanceRef.current = null;
      if (viewerRef) viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // External room change (HUD)
  useEffect(() => {
    const viewer = instanceRef.current;
    if (!viewer || !currentRoomId) return;
    const room = rooms.find((r) => r.id === currentRoomId);
    if (!room) return;
    const sceneId = room.slug ?? room.id;
    try { viewer.loadScene(sceneId); } catch { /* ignore */ }
  }, [currentRoomId, rooms]);

  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const isInSalle = currentRoom?.kind === "salle";
  const corridorSlug = corridorRoom?.slug ?? corridorRoom?.id ?? null;

  const handleExitSalle = () => {
    if (corridorSlug) goToScene(corridorSlug, 0, 0);
  };

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {isInSalle && (
        <button
          type="button"
          onClick={handleExitSalle}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-black/40 backdrop-blur-sm border border-[color:var(--gold)]/40 text-[color:var(--gold-soft)] text-[10px] tracking-[0.28em] uppercase font-sans hover:bg-black/60 hover:border-[color:var(--gold)] transition opacity-80 hover:opacity-100"
          aria-label="Sortir de la salle"
        >
          <span aria-hidden>←</span>
          Sortir
        </button>
      )}

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-sm border border-[color:var(--gold)]/30 text-[10px] tracking-[0.18em] uppercase text-[color:var(--gold-soft)] font-sans">
        Cliquez les marqueurs au sol pour avancer
      </div>
    </div>
  );
}
