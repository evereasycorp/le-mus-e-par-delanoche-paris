import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import "pannellum/build/pannellum.css";
import "pannellum/build/pannellum.js";
import { resolvePanoramaUrl } from "./panoramas";
import { useMuseumAudio, playFootstep } from "./useMuseumAudio";
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

// --- Camera tuning : vision quasi-humaine, moins de fisheye -----------------
const DEFAULT_HFOV = 72;
const MIN_HFOV = 42;
const MAX_HFOV = 92;
const SCENE_FADE = 1000;
const CAMERA_FRICTION = 0.22;

// --- Floor markers ---------------------------------------------------------
const FLOOR_PITCH = -34;

// Yaws réels des ouvertures du couloir mesurés sur la panorama :
//   paire avant  : ±83°   (portes les plus proches du visiteur)
//   paire arrière: ±166°  (portes derrière le visiteur)
// Index pair → yaw distance par rapport au visiteur, side alterne L/R.
const DOOR_PAIR_YAWS = [83, 166];

// Yaws des ailes Art / Littérature dans le hall (depuis le palier).
const ART_WING_YAW = -96;
const LITT_WING_YAW = 96;

// IDs de scènes virtuelles (réutilisent une panorama existante avec un
// cadrage différent — donne l'impression de progression spatiale).
const LANDING_SCENE_ID = "__entrance_landing";
const CORRIDOR_DEEP_ID = "__corridor_deep";

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
  const [debug, setDebug] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("debug");
  });
  const [hud, setHud] = useState({ yaw: 0, pitch: 0, hfov: DEFAULT_HFOV, scene: "" });

  // Démarre l'ambiance sonore au premier clic utilisateur.
  useMuseumAudio(true);

  const cbRef = useRef({ onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand });
  cbRef.current = { onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand };

  const liveRef = useRef({ activeBrandId, activeBrandPieces, brands, rooms });
  liveRef.current = { activeBrandId, activeBrandPieces, brands, rooms };

  const salleRoom = useMemo(() => rooms.find((r) => r.kind === "salle"), [rooms]);
  const entranceRoom = useMemo(() => rooms.find((r) => r.kind === "entrance"), [rooms]);
  const corridorRoom = useMemo(() => rooms.find((r) => r.kind === "corridor"), [rooms]);

  // Transition cinématographique : dolly-zoom + fade + petit pas sonore.
  const goToScene = (sceneId: string, targetYaw = 0, targetPitch = 0, targetHfov = DEFAULT_HFOV) => {
    const v = instanceRef.current;
    if (!v) return;
    playFootstep();
    const startHfov = v.getHfov();
    const endHfov = 50;
    const duration = 540;
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
        try { v2.loadScene(sceneId, targetPitch, targetYaw, targetHfov); } catch { /* ignore */ }
      }
    };
    requestAnimationFrame(step);
  };

  const showSoon = (label: string) => {
    playFootstep();
    toast(`${label} — cette aile du musée ouvrira prochainement.`, {
      duration: 3200,
      className: "font-sans",
    });
  };

  const showMonogramInfo = () => {
    toast("« Le Sceau » — sculpture monumentale, marbre ivoire & bronze patiné.", {
      description: "Œuvre emblématique de la collection Delanoche Paris.",
      duration: 4200,
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
      friction: CAMERA_FRICTION,
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

      // ===== HALL D'ENTRÉE (rez-de-chaussée) =====
      if (room.kind === "entrance") {
        // Médaillon "Le Sceau" — œuvre centrale du musée, posée au pied de
        // l'escalier (signature patrimoniale plutôt qu'un logo publicitaire).
        hs.push({
          type: "info",
          pitch: -18,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-monogram",
          text: "« Le Sceau » — Delanoche Paris",
          clickHandlerFunc: showMonogramInfo,
        });
        // UN SEUL hotspot de navigation au sol : monter l'escalier.
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH + 4,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-stair",
          text: "Monter l'escalier",
          clickHandlerFunc: () => goToScene(LANDING_SCENE_ID, 0, 2, 70),
        });
      }

      // ===== COULOIR DES CRÉATEURS =====
      if (room.kind === "corridor") {
        // Retour vers le palier.
        if (entranceSlug) {
          hs.push({
            type: "info",
            pitch: FLOOR_PITCH,
            yaw: 180,
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
            text: "Retour au palier",
            clickHandlerFunc: () => goToScene(LANDING_SCENE_ID, 180, 0, 70),
          });
        }
        // Avancer plus profondément dans le couloir (cadrage rapproché).
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH + 8,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-forward",
          text: "Avancer dans le couloir",
          clickHandlerFunc: () => goToScene(CORRIDOR_DEEP_ID, 0, 0, 62),
        });
        // Une flèche par porte de créateur, centrée devant l'ouverture réelle.
        if (salleSlug) {
          brands.forEach((b, i) => {
            const pairIndex = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1;
            const baseYaw = DOOR_PAIR_YAWS[pairIndex] ?? 83;
            const doorYaw = side * baseYaw;
            hs.push({
              type: "info",
              pitch: FLOOR_PITCH,
              yaw: doorYaw,
              cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-door",
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

      // ----- Hotspots in-room existants (pièces, mur de marque) -----
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
    // Réutilise la panorama du hall avec un cadrage légèrement plus élevé.
    // C'est ICI que se trouvent les entrées Art, Littérature ET couloir.
    if (entranceRoom && corridorSlug && entranceSlug) {
      const landingHs: PannellumHotSpot[] = [
        // Couloir des créateurs — droit devant.
        {
          type: "info",
          pitch: FLOOR_PITCH + 6,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-forward",
          text: "Couloir des créateurs",
          clickHandlerFunc: () => goToScene(corridorSlug, 0, 0),
        },
        // Aile Art — à gauche.
        {
          type: "info",
          pitch: -8,
          yaw: ART_WING_YAW,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-soon",
          text: "Aile Art",
          clickHandlerFunc: () => showSoon("Aile Art"),
        },
        // Aile Littérature — à droite.
        {
          type: "info",
          pitch: -8,
          yaw: LITT_WING_YAW,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-soon",
          text: "Aile Littérature",
          clickHandlerFunc: () => showSoon("Aile Littérature"),
        },
        // Redescendre dans le hall.
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
        hfov: 70,
        pitch: 2,
        yaw: 0,
        hotSpots: landingHs,
      };
    }

    // ===== Scène virtuelle "Couloir profond" (avancée dans le couloir) =====
    // Réutilise la panorama couloir avec un cadrage plus serré sur le vista.
    if (corridorRoom && corridorSlug && salleSlug && entranceSlug) {
      const deepHs: PannellumHotSpot[] = [
        // Reculer vers l'entrée du couloir.
        {
          type: "info",
          pitch: FLOOR_PITCH,
          yaw: 180,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
          text: "Reculer",
          clickHandlerFunc: () => goToScene(corridorSlug, 0, 0),
        },
        // Portes les plus proches (paire arrière, devenues plus proches depuis
        // qu'on a avancé) : on les rend cliquables ici aussi.
      ];
      if (salleSlug) {
        brands.slice(2, 4).forEach((b, i) => {
          const side = i % 2 === 0 ? -1 : 1;
          deepHs.push({
            type: "info",
            pitch: FLOOR_PITCH,
            yaw: side * 90,
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-door",
            text: b.name,
            clickHandlerFunc: () => {
              cbRef.current.onSelectBrand(b.id);
              goToScene(salleSlug, 0, 0);
            },
          });
        });
      }
      scenes[CORRIDOR_DEEP_ID] = {
        ...baseScene(corridorRoom.panorama_url),
        hfov: 62,
        pitch: 0,
        yaw: 0,
        hotSpots: deepHs,
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
        friction: CAMERA_FRICTION,
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
      const resolvedId =
        sceneId === LANDING_SCENE_ID
          ? (entranceRoom?.slug ?? entranceRoom?.id ?? sceneId)
          : sceneId === CORRIDOR_DEEP_ID
          ? (corridorRoom?.slug ?? corridorRoom?.id ?? sceneId)
          : sceneId;
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
