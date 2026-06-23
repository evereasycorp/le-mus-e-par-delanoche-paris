import { useEffect, useMemo, useRef } from "react";
import "pannellum/build/pannellum.css";
import "pannellum/build/pannellum.js";
import { resolvePanoramaUrl } from "./panoramas";
import type { Hotspot, Room, SalleBrand, BrandLite } from "./types";

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

export function PannellumViewer({
  rooms,
  hotspots,
  salleBrands,
  brandsById,
  currentRoomId,
  onChangeRoom,
  onOpenGarment,
  onOpenBrand,
  viewerRef,
}: {
  rooms: Room[];
  hotspots: Hotspot[];
  salleBrands: SalleBrand[];
  brandsById: Map<string, BrandLite>;
  currentRoomId: string | null;
  onChangeRoom: (roomId: string) => void;
  onOpenGarment: (pieceId: string) => void;
  onOpenBrand: (brandId: string) => void;
  viewerRef?: React.MutableRefObject<PannellumViewerHandle | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<PannellumViewerInstance | null>(null);

  // Stable callbacks via refs so config doesn't rebuild on every render
  const cbRef = useRef({ onChangeRoom, onOpenGarment, onOpenBrand });
  cbRef.current = { onChangeRoom, onOpenGarment, onOpenBrand };

  // Build pannellum config from rooms+hotspots once (rooms list is stable per floor)
  const config = useMemo(() => {
    if (rooms.length === 0) return null;
    const scenes: Record<string, PannellumScene> = {};
    const idToSlug = new Map(rooms.map((r) => [r.id, r.slug ?? r.id]));

    for (const room of rooms) {
      const sceneId = room.slug ?? room.id;
      const roomHotspots = hotspots.filter((h) => h.room_id === room.id);
      const slotsByRoom = new Map(
        salleBrands.filter((sb) => sb.salle_id === room.id).map((sb) => [sb.slot_index, sb]),
      );

      const hs: PannellumHotSpot[] = [];
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
        } else if (h.type === "garmentInfo") {
          const slot = h.slot_index != null ? slotsByRoom.get(h.slot_index) : undefined;
          const active = !!h.garment_id && !!slot?.brand_id;
          hs.push({
            type: "info",
            yaw: h.yaw,
            pitch: h.pitch,
            text: active ? (h.label ?? "Voir le vêtement") : "Stand disponible",
            cssClass: active
              ? "pnlm-hotspot-museum pnlm-hotspot-garment"
              : "pnlm-hotspot-museum pnlm-hotspot-empty",
            clickHandlerFunc: active
              ? () => cbRef.current.onOpenGarment(h.garment_id!)
              : () => {},
          });
        } else if (h.type === "brandWall") {
          const slot = h.slot_index != null ? slotsByRoom.get(h.slot_index) : undefined;
          const brand = slot?.brand_id ? brandsById.get(slot.brand_id) : undefined;
          const active = !!brand;
          hs.push({
            type: "info",
            yaw: h.yaw,
            pitch: h.pitch,
            text: active ? (brand?.name ?? "Maison") : "Stand disponible",
            cssClass: active
              ? "pnlm-hotspot-museum pnlm-hotspot-wall"
              : "pnlm-hotspot-museum pnlm-hotspot-empty",
            clickHandlerFunc: active
              ? () => cbRef.current.onOpenBrand(brand!.id)
              : () => {},
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
      default: { firstScene, sceneFadeDuration: 600, autoLoad: true },
      scenes,
    };
  }, [rooms, hotspots, salleBrands, brandsById]);

  // Mount pannellum once when config is ready
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
    // We intentionally mount once per config build.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // External room change (HUD filmstrip / arrows) → tell pannellum to load that scene
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
