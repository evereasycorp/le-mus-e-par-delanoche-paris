import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PanoramaScene } from "./PanoramaScene";
import { HotspotLayer } from "./HotspotLayer";
import { HUD } from "./HUD";
import { GarmentSheet } from "./GarmentSheet";
import { BrandIdentitySheet } from "./BrandIdentitySheet";
import { useRooms, useHotspots, useBrands, usePieces } from "./usePanoramaData";
import { useVisiteStore } from "./store";
import { resolvePanoramaUrl } from "./panoramas";
import type { Hotspot, Room } from "./types";

const TAP_THRESHOLD_PX = 8;
const INERTIA_DURATION = 400;
const TRANSITION_DURATION = 600;

export function PanoramaViewer({ floor }: { floor: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data: rooms = [] } = useRooms(floor);
  const currentRoomId = useVisiteStore((s) => s.currentRoomId);
  const setRoom = useVisiteStore((s) => s.setRoom);
  const sheet = useVisiteStore((s) => s.sheet);
  const openGarment = useVisiteStore((s) => s.openGarment);
  const openBrand = useVisiteStore((s) => s.openBrand);
  const closeSheet = useVisiteStore((s) => s.closeSheet);
  const isTransitioning = useVisiteStore((s) => s.isTransitioning);
  const beginTransition = useVisiteStore((s) => s.beginTransition);
  const endTransition = useVisiteStore((s) => s.endTransition);

  // Set initial room (corridor) once rooms load
  useEffect(() => {
    if (!currentRoomId && rooms.length > 0) {
      const corridor = rooms.find((r) => r.kind === "corridor") ?? rooms[0];
      setRoom(corridor.id);
    }
  }, [rooms, currentRoomId, setRoom]);

  const currentRoom = useMemo<Room | null>(
    () => rooms.find((r) => r.id === currentRoomId) ?? null,
    [rooms, currentRoomId],
  );

  const { data: rawHotspots = [] } = useHotspots(currentRoomId);
  // Garde défensive : on n'affiche jamais un hotspot orphelin (garment_id null, brand_id null)
  const hotspots = useMemo(
    () =>
      rawHotspots.filter((h) => {
        if (h.type === "garmentInfo") return !!h.garment_id;
        if (h.type === "brandWall") return !!h.brand_id;
        if (h.type === "nav") return !!h.target_room_id;
        return true;
      }),
    [rawHotspots],
  );

  // À chaque changement de salle, oriente la caméra vers un point intéressant
  // (brandWall dans une salle de marque, premier nav dans le couloir) pour qu'un
  // élément interactif soit immédiatement visible sans avoir à drague.
  useEffect(() => {
    if (!currentRoomId || hotspots.length === 0) return;
    const room = rooms.find((r) => r.id === currentRoomId);
    let target = hotspots[0];
    if (room?.kind === "brand_room") {
      target = hotspots.find((h) => h.type === "brandWall") ?? target;
    } else {
      target = hotspots.find((h) => h.type === "nav") ?? target;
    }
    useVisiteStore.getState().setOrientation((target.yaw * Math.PI) / 180, 0);
  }, [currentRoomId, hotspots, rooms]);

  const brandIds = useMemo(
    () => Array.from(new Set(hotspots.map((h) => h.brand_id).filter(Boolean) as string[])),
    [hotspots],
  );
  const { data: brandsArr = [] } = useBrands(brandIds);
  const brandsById = useMemo(() => new Map(brandsArr.map((b) => [b.id, b])), [brandsArr]);

  const pieceIds = useMemo(
    () => Array.from(new Set(hotspots.map((h) => h.garment_id).filter(Boolean) as string[])),
    [hotspots],
  );
  const { data: piecesArr = [] } = usePieces(pieceIds);
  const piecesById = useMemo(() => new Map(piecesArr.map((p) => [p.id, p])), [piecesArr]);

  const panoramaUrl = resolvePanoramaUrl(currentRoom?.panorama_url);
  const preloadUrls = useMemo(() => {
    const urls: string[] = [];
    if (currentRoom?.next_room_id) {
      const next = rooms.find((r) => r.id === currentRoom.next_room_id);
      if (next) urls.push(resolvePanoramaUrl(next.panorama_url));
    }
    return urls;
  }, [currentRoom, rooms]);

  // Preload data for next room
  useEffect(() => {
    const nextId = currentRoom?.next_room_id;
    if (nextId) {
      qc.prefetchQuery({
        queryKey: ["visite", "hotspots", nextId],
        queryFn: async () => [],
      });
    }
  }, [currentRoom, qc]);

  // ---- Drag-look with inertia ----
  const dragState = useRef({
    active: false,
    movedPx: 0,
    lastX: 0,
    lastY: 0,
    velYaw: 0,
    velPitch: 0,
    lastT: 0,
  });
  const inertiaRaf = useRef<number | null>(null);
  const [, setTick] = useState(0); // (unused) keeps lint happy

  // Pointer-event handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (sheet.kind !== "none" || isTransitioning) return;
    if (inertiaRaf.current) cancelAnimationFrame(inertiaRaf.current);
    dragState.current = {
      active: true,
      movedPx: 0,
      lastX: e.clientX,
      lastY: e.clientY,
      velYaw: 0,
      velPitch: 0,
      lastT: performance.now(),
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.movedPx += Math.hypot(dx, dy);
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    const w = containerRef.current?.clientWidth ?? 1;
    const h = containerRef.current?.clientHeight ?? 1;
    const { yaw, pitch, fov, setOrientation } = useVisiteStore.getState();
    const fovRad = (fov * Math.PI) / 180;
    const yawDelta = -(dx / w) * fovRad * (w / h);
    const pitchDelta = -(dy / h) * fovRad;
    setOrientation(yaw + yawDelta, pitch + pitchDelta);
    d.velYaw = yawDelta / dt;
    d.velPitch = pitchDelta / dt;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;
  };

  const onPointerUp = (_e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d.active) return;
    d.active = false;
    const wasTap = d.movedPx < TAP_THRESHOLD_PX;
    if (wasTap) return;
    // Inertia decay (ease-out)
    const start = performance.now();
    const v0Yaw = d.velYaw;
    const v0Pitch = d.velPitch;
    const step = () => {
      const t = (performance.now() - start) / INERTIA_DURATION;
      if (t >= 1) {
        inertiaRaf.current = null;
        return;
      }
      const ease = 1 - t; // linear decay of velocity; integrated gives ease-out displacement
      const dt = 16;
      const { yaw, pitch, setOrientation } = useVisiteStore.getState();
      setOrientation(yaw + v0Yaw * ease * dt, pitch + v0Pitch * ease * dt);
      inertiaRaf.current = requestAnimationFrame(step);
      setTick((x) => x); // no-op
    };
    inertiaRaf.current = requestAnimationFrame(step);
  };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    if (sheet.kind !== "none") return;
    const { fov, setFov } = useVisiteStore.getState();
    setFov(fov + (e.deltaY > 0 ? 4 : -4));
  };

  // Activate hotspot
  const onActivateHotspot = (h: Hotspot) => {
    if (h.type === "nav" && h.target_room_id) {
      goToRoom(h.target_room_id);
    } else if (h.type === "garmentInfo" && h.garment_id) {
      openGarment(h.garment_id);
    } else if (h.type === "brandWall" && h.brand_id) {
      openBrand(h.brand_id);
    }
  };

  function goToRoom(roomId: string) {
    if (roomId === currentRoomId) return;
    beginTransition();
    setTimeout(() => {
      setRoom(roomId);
      setTimeout(() => endTransition(), TRANSITION_DURATION / 2);
    }, TRANSITION_DURATION / 2);
  }

  const activeGarment = sheet.kind === "garment" ? piecesById.get(sheet.garmentId) ?? null : null;
  const activeBrand = sheet.kind === "brand" ? brandsById.get(sheet.brandId) ?? null : null;
  const isInteractive = sheet.kind === "none" && !isTransitioning;

  // Preload pieces info for current room so taps don't flash
  useEffect(() => {
    /* react-query handles this via usePieces */
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-3.5rem)] w-full touch-none overflow-hidden bg-black select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <PanoramaScene panoramaUrl={panoramaUrl} preloadUrls={preloadUrls} />
      <HotspotLayer
        hotspots={hotspots}
        brandsById={brandsById}
        containerRef={containerRef}
        onActivateHotspot={onActivateHotspot}
        isInteractive={isInteractive}
      />
      <HUD currentRoom={currentRoom} rooms={rooms} onGoToRoom={goToRoom} />

      {/* Transition veil */}
      <div
        className="pointer-events-none absolute inset-0 z-40 bg-black transition-opacity"
        style={{
          opacity: isTransitioning ? 1 : 0,
          transitionDuration: `${TRANSITION_DURATION / 2}ms`,
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <GarmentSheet piece={activeGarment} open={sheet.kind === "garment"} onClose={closeSheet} />
      <BrandIdentitySheet brand={activeBrand} open={sheet.kind === "brand"} onClose={closeSheet} />
    </div>
  );
}
