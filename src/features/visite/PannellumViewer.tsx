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
  loadScene: (id: string) => void;
  setHfov: (n: number) => void;
  getHfov: () => number;
  getYaw?: () => number;
  getPitch?: () => number;
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

// Fixed door positions in the corridor panorama — visual openings on left/right.
// Yaws are evenly spaced; brands cycle through them, supporting unlimited creators.
const DOOR_POSITIONS: { yaw: number; pitch: number }[] = [
  { yaw: -135, pitch: -5 },
  { yaw: -75, pitch: -5 },
  { yaw: -35, pitch: -5 },
  { yaw: 35, pitch: -5 },
  { yaw: 75, pitch: -5 },
  { yaw: 135, pitch: -5 },
];

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

  // Stable callbacks via refs so config doesn't rebuild on every render
  const cbRef = useRef({ onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand });
  cbRef.current = { onChangeRoom, onOpenGarment, onOpenBrand, onSelectBrand };

  const salleRoom = useMemo(() => rooms.find((r) => r.kind === "salle"), [rooms]);
  const corridorRoom = useMemo(() => rooms.find((r) => r.kind === "corridor"), [rooms]);
  const activeBrand = useMemo(
    () => brands.find((b) => b.id === activeBrandId) ?? null,
    [brands, activeBrandId],
  );

  // Build pannellum config
  const config = useMemo(() => {
    if (rooms.length === 0) return null;
    const scenes: Record<string, PannellumScene> = {};
    const idToSlug = new Map(rooms.map((r) => [r.id, r.slug ?? r.id]));

    for (const room of rooms) {
      const sceneId = room.slug ?? room.id;
      const roomHotspots = hotspots.filter((h) => h.room_id === room.id);

      const hs: PannellumHotSpot[] = [];

      // Stored hotspots (nav, mannequins, hangers, brand wall)
      for (const h of roomHotspots) {
        if (h.type === "nav" && h.target_room_id) {
          const targetSlug = idToSlug.get(h.target_room_id);
          if (!targetSlug) continue;
          hs.push({
            type: "scene",
            sceneId: targetSlug,
            yaw: h.yaw,
            pitch: h.pitch,
            text: h.label ?? "Aller",
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-nav",
          });
        } else if (room.kind === "salle" && h.type === "garmentInfo") {
          // Map slot_index → active brand's piece at that index
          const idx = h.slot_index ?? 0;
          const piece = activeBrandPieces[idx] ?? null;
          const active = !!piece;
          hs.push({
            type: "info",
            yaw: h.yaw,
            pitch: h.pitch,
            text: active ? piece!.name : "Pièce à venir",
            cssClass: active
              ? "pnlm-hotspot-museum pnlm-hotspot-garment"
              : "pnlm-hotspot-museum pnlm-hotspot-empty",
            clickHandlerFunc: active ? () => cbRef.current.onOpenGarment(piece!.id) : () => {},
          });
        } else if (room.kind === "salle" && h.type === "brandWall") {
          const active = !!activeBrand;
          hs.push({
            type: "info",
            yaw: h.yaw,
            pitch: h.pitch,
            text: active ? activeBrand!.name : "Identité de la maison",
            cssClass: active
              ? "pnlm-hotspot-museum pnlm-hotspot-wall"
              : "pnlm-hotspot-museum pnlm-hotspot-empty",
            clickHandlerFunc: active
              ? () => cbRef.current.onOpenBrand(activeBrand!.id)
              : () => {},
          });
        }
      }

      // Corridor: inject one door per brand (cycling through fixed yaw positions).
      // Supports unlimited brands without touching the code.
      if (room.kind === "corridor" && salleRoom) {
        const salleSlug = idToSlug.get(salleRoom.id) ?? salleRoom.slug ?? salleRoom.id;
        brands.forEach((brand, i) => {
          const pos = DOOR_POSITIONS[i % DOOR_POSITIONS.length];
          hs.push({
            type: "info",
            yaw: pos.yaw,
            pitch: pos.pitch,
            text: brand.name,
            cssClass: "pnlm-hotspot-museum pnlm-hotspot-door",
            clickHandlerFunc: () => {
              cbRef.current.onSelectBrand(brand.id);
              const viewer = instanceRef.current;
              if (viewer) {
                try {
                  viewer.loadScene(salleSlug);
                } catch {
                  /* noop */
                }
              }
            },
          });
        });
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
  }, [rooms, hotspots, brands, activeBrand, activeBrandPieces, salleRoom, corridorRoom]);

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
    return () => {
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

  return <div ref={containerRef} className="absolute inset-0 bg-black" />;
}
