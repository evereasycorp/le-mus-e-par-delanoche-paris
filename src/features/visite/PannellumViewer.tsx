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
  mouseEventToCoords?: (e: MouseEvent) => [number, number]; // [pitch, yaw]
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

// Paired brand-door yaws used both as visual reference and as click-routing zones.
const DOOR_PAIR_YAWS = [85, 50, 28, 16, 10];
// Half-width (in degrees) of the yaw zone that routes a double-click to a given door.
const DOOR_HIT_HALF = 22;
// Half-width of the "back" zone (around yaw 180) that routes to the previous scene.
const BACK_HIT_HALF = 60;



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

  // Stable callbacks via refs so config doesn't rebuild on every render.
  const cbRef = useRef({ onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand });
  cbRef.current = { onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand };

  // Live state — accessed via ref so brand switches or room transitions
  // don't trigger a full viewer remount.
  const liveRef = useRef({ activeBrandId, activeBrandPieces, brands, rooms });
  liveRef.current = { activeBrandId, activeBrandPieces, brands, rooms };

  const salleRoom = useMemo(() => rooms.find((r) => r.kind === "salle"), [rooms]);
  const entranceRoom = useMemo(() => rooms.find((r) => r.kind === "entrance"), [rooms]);
  const corridorRoom = useMemo(() => rooms.find((r) => r.kind === "corridor"), [rooms]);


  // Build pannellum config (depends only on rooms / hotspots / brands count, not on activeBrand)
  const config = useMemo(() => {
    if (rooms.length === 0) return null;
    const scenes: Record<string, PannellumScene> = {};
    const idToSlug = new Map(rooms.map((r) => [r.id, r.slug ?? r.id]));

    for (const room of rooms) {
      const sceneId = room.slug ?? room.id;
      const roomHotspots = hotspots.filter((h) => h.room_id === room.id);

      const hs: PannellumHotSpot[] = [];

      for (const h of roomHotspots) {
        if (h.type === "nav") {
          // Navigation is handled globally via double-click on the panorama.
          continue;
        }
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

      // Note: corridor brand doors are no longer rendered as hotspots.
      // Double-click in the direction of a brand opens its salle (see dblclick handler below).



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
  }, [rooms, hotspots, brands, salleRoom]);

  // Mount pannellum once per config build
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

    // -------- Double-click = cinematic "walk forward" zoom --------
    // Smallest unsigned angular delta between two yaws, in degrees.
    const yawDelta = (a: number, b: number) => {
      const d = ((a - b + 540) % 360) - 180;
      return Math.abs(d);
    };

    // Animate hfov from current to a tighter value (zoom in), then optionally
    // load the next scene. Gives the user a sense of stepping into the place.
    const zoomThen = (next: { sceneId: string } | null) => {
      const v = instanceRef.current;
      if (!v) return;
      const startHfov = v.getHfov();
      const endHfov = next ? 42 : Math.max(55, startHfov - 18);
      const duration = next ? 700 : 450;
      const t0 = performance.now();
      const step = (now: number) => {
        const v2 = instanceRef.current;
        if (!v2) return;
        const t = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        try {
          v2.setHfov(startHfov + (endHfov - startHfov) * e);
        } catch {
          /* ignore */
        }
        if (t < 1) {
          requestAnimationFrame(step);
        } else if (next) {
          try {
            v2.loadScene(next.sceneId, 0, 0, 100);
          } catch {
            /* ignore */
          }
        }
      };
      requestAnimationFrame(step);
    };

    const handleDblClick = (ev: MouseEvent) => {
      const v = instanceRef.current;
      if (!v) return;
      const { rooms: liveRooms, brands: liveBrands } = liveRef.current;
      const currentSlug = v.getScene?.();
      const currentRoom = liveRooms.find((r) => (r.slug ?? r.id) === currentSlug);
      if (!currentRoom) return;

      const slugOf = (r: { slug?: string | null; id: string } | undefined) =>
        r ? r.slug ?? r.id : undefined;
      const entranceSlug = slugOf(entranceRoom);
      const corridorSlug = slugOf(corridorRoom);
      const salleSlug = slugOf(salleRoom);

      let clickYaw: number | null = null;
      try {
        const coords = v.mouseEventToCoords?.(ev);
        if (coords) clickYaw = coords[1];
      } catch {
        /* fall through */
      }

      if (currentRoom.kind === "entrance") {
        // Anywhere → cinematic zoom up the stairs, then enter the corridor.
        zoomThen(corridorSlug ? { sceneId: corridorSlug } : null);
        return;
      }

      if (currentRoom.kind === "corridor") {
        // Back zone (~ yaw 180) → zoom + return to the hall.
        if (clickYaw !== null && yawDelta(clickYaw, 180) <= BACK_HIT_HALF) {
          zoomThen(entranceSlug ? { sceneId: entranceSlug } : null);
          return;
        }
        // Closest door zone → select brand + zoom into the salle.
        if (clickYaw !== null && liveBrands.length > 0 && salleSlug) {
          let bestIdx = -1;
          let bestDist = Infinity;
          liveBrands.forEach((_, i) => {
            const pairIndex = Math.floor(i / 2);
            const side = i % 2 === 0 ? -1 : 1;
            const baseYaw = DOOR_PAIR_YAWS[pairIndex] ?? 6;
            const doorYaw = side * baseYaw;
            const d = yawDelta(clickYaw!, doorYaw);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          });
          if (bestIdx >= 0 && bestDist <= DOOR_HIT_HALF) {
            cbRef.current.onSelectBrand(liveBrands[bestIdx].id);
            zoomThen({ sceneId: salleSlug });
            return;
          }
        }
        // No door in this direction → just a "step closer" zoom, no transition.
        zoomThen(null);
        return;
      }

      if (currentRoom.kind === "salle") {
        // No auto-exit on dbl-click — visitor uses the explicit "Sortir" button.
        // Double-click in a salle simply zooms in to inspect the scene.
        zoomThen(null);
        return;
      }
    };


    el.addEventListener("dblclick", handleDblClick);

    return () => {
      el.removeEventListener("dblclick", handleDblClick);
      try {
        viewer.destroy();
      } catch {
        /* ignore */
      }
      instanceRef.current = null;
      if (viewerRef) viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);


  // External room change (HUD) → tell pannellum to load that scene
  useEffect(() => {
    const viewer = instanceRef.current;
    if (!viewer || !currentRoomId) return;
    const room = rooms.find((r) => r.id === currentRoomId);
    if (!room) return;
    const sceneId = room.slug ?? room.id;
    try {
      viewer.loadScene(sceneId);
    } catch {
      /* scene may already be active */
    }
  }, [currentRoomId, rooms]);

  const currentRoom = rooms.find((r) => r.id === currentRoomId);
  const isInSalle = currentRoom?.kind === "salle";
  const corridorSlug = corridorRoom?.slug ?? corridorRoom?.id ?? null;

  const handleExitSalle = () => {
    const v = instanceRef.current;
    if (v && corridorSlug) {
      try {
        v.loadScene(corridorSlug, 0, 0, 100);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {isInSalle && (
        <button
          type="button"
          onClick={handleExitSalle}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm border border-[color:var(--gold)]/50 text-[color:var(--gold-soft)] text-[11px] tracking-[0.22em] uppercase font-sans hover:bg-black/85 hover:border-[color:var(--gold)] transition"
          aria-label="Sortir de la salle"
        >
          <span aria-hidden>←</span>
          Sortir de la salle
        </button>
      )}

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-sm border border-[color:var(--gold)]/30 text-[10px] tracking-[0.18em] uppercase text-[color:var(--gold-soft)] font-sans">
        {isInSalle ? "Double-cliquez pour observer" : "Double-cliquez pour avancer"}
      </div>
    </div>
  );
}


