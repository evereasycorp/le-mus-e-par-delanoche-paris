import { useEffect, useMemo, useRef } from "react";
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
          default: { firstScene: string; sceneFadeDuration?: number; autoLoad?: boolean };
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

// Floor pitch for navigation arrows (looking down at the ground in front of the viewer).
const FLOOR_PITCH = -38;
// Yaws of the brand doors along the corridor (alternating left/right, going deeper).
const DOOR_PAIR_YAWS = [70, 38, 22, 12, 8];

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

  // Smooth animated scene transition with a brief zoom-in feel.
  const goToScene = (sceneId: string, targetYaw = 0) => {
    const v = instanceRef.current;
    if (!v) return;
    const startHfov = v.getHfov();
    const endHfov = 55;
    const duration = 480;
    const t0 = performance.now();
    const step = (now: number) => {
      const v2 = instanceRef.current;
      if (!v2) return;
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      try {
        v2.setHfov(startHfov + (endHfov - startHfov) * e);
      } catch { /* ignore */ }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        try {
          v2.loadScene(sceneId, 0, targetYaw, 100);
        } catch { /* ignore */ }
      }
    };
    requestAnimationFrame(step);
  };

  const config = useMemo(() => {
    if (rooms.length === 0) return null;
    const scenes: Record<string, PannellumScene> = {};

    const slugOf = (r: Room | undefined) => (r ? r.slug ?? r.id : undefined);
    const entranceSlug = slugOf(entranceRoom);
    const corridorSlug = slugOf(corridorRoom);
    const salleSlug = slugOf(salleRoom);

    for (const room of rooms) {
      const sceneId = room.slug ?? room.id;
      const roomHotspots = hotspots.filter((h) => h.room_id === room.id);
      const hs: PannellumHotSpot[] = [];

      // ----- Floor arrows: single-click navigation -----
      if (room.kind === "entrance" && corridorSlug) {
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH,
          yaw: 0,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow",
          text: "Monter au couloir des créateurs",
          clickHandlerFunc: () => goToScene(corridorSlug, 0),
        });
      }

      if (room.kind === "corridor") {
        // Back arrow to the entrance hall.
        if (entranceSlug) {
          hs.push({
            type: "info",
            pitch: FLOOR_PITCH,
            yaw: 180,
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
            text: "Retour au hall",
            clickHandlerFunc: () => goToScene(entranceSlug, 0),
          });
        }
        // One floor arrow per brand door (alternating left / right, deeper into the corridor).
        if (salleSlug) {
          brands.forEach((b, i) => {
            const pairIndex = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1;
            const baseYaw = DOOR_PAIR_YAWS[pairIndex] ?? 6;
            const doorYaw = side * baseYaw;
            // Push arrow slightly off-axis so two adjacent arrows don't overlap.
            const arrowPitch = FLOOR_PITCH + (pairIndex % 2 === 0 ? 0 : -4);
            hs.push({
              type: "info",
              pitch: arrowPitch,
              yaw: doorYaw,
              cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow",
              text: b.name,
              clickHandlerFunc: () => {
                cbRef.current.onSelectBrand(b.id);
                goToScene(salleSlug, 0);
              },
            });
          });
        }
      }

      if (room.kind === "salle" && corridorSlug) {
        hs.push({
          type: "info",
          pitch: FLOOR_PITCH,
          yaw: 180,
          cssClass: "pnlm-hotspot-museum pnlm-hotspot-arrow pnlm-hotspot-back",
          text: "Retour au couloir",
          clickHandlerFunc: () => goToScene(corridorSlug, 0),
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
        type: "equirectangular",
        panorama: resolvePanoramaUrl(room.panorama_url),
        hfov: 100,
        yaw: 0,
        pitch: 0,
        autoLoad: true,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        showControls: false,
        hotSpots: hs,
      };
    }

    const firstRoom =
      rooms.find((r) => r.kind === "entrance") ??
      rooms.find((r) => r.kind === "corridor") ??
      rooms[0];
    const firstScene = firstRoom?.slug ?? firstRoom?.id ?? Object.keys(scenes)[0];

    return {
      default: { firstScene, sceneFadeDuration: 700, autoLoad: true },
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
      const room = rooms.find((r) => (r.slug ?? r.id) === sceneId);
      if (room) cbRef.current.onChangeRoom(room.id);
    });
    if (viewerRef) {
      viewerRef.current = {
        zoomIn: () => viewer.setHfov(Math.max(40, viewer.getHfov() - 8)),
        zoomOut: () => viewer.setHfov(Math.min(120, viewer.getHfov() + 8)),
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
    if (corridorSlug) goToScene(corridorSlug, 0);
  };

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Discrete "Sortir" plaque, styled like a door sign at the bottom of the scene */}
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
        Cliquez les flèches au sol pour avancer
      </div>
    </div>
  );
}
