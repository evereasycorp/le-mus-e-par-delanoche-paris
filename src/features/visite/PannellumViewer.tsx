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

    // -------- Double-click to advance --------
    // Smallest signed angular delta between two yaws, in degrees.
    const yawDelta = (a: number, b: number) => {
      let d = ((a - b + 540) % 360) - 180;
      return Math.abs(d);
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

      // Get the yaw the user double-clicked on.
      let clickYaw: number | null = null;
      try {
        const coords = v.mouseEventToCoords?.(ev);
        if (coords) clickYaw = coords[1];
      } catch {
        /* fall through */
      }

      if (currentRoom.kind === "entrance") {
        // Anywhere → go up the stairs into the corridor.
        if (corridorSlug) v.loadScene(corridorSlug, 0, 0, 100);
        return;
      }

      if (currentRoom.kind === "corridor") {
        // Click in the back zone (~ yaw 180) → return to the hall.
        if (clickYaw !== null && yawDelta(clickYaw, 180) <= BACK_HIT_HALF) {
          if (entranceSlug) v.loadScene(entranceSlug, 0, 0, 100);
          return;
        }
        // Find the closest brand door by yaw.
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
            v.loadScene(salleSlug, 0, 0, 100);
          }
        }
        return;
      }

      if (currentRoom.kind === "salle") {
        // Anywhere → return to the corridor.
        if (corridorSlug) v.loadScene(corridorSlug, 0, 0, 100);
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

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-sm border border-[color:var(--gold)]/30 text-[10px] tracking-[0.18em] uppercase text-[color:var(--gold-soft)] font-sans">
        Double-cliquez pour avancer
      </div>
    </div>
  );
}

