import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useNavigate } from "@tanstack/react-router";
import * as THREE from "three";
import { useGalleryData } from "./useGalleryData";
import { useVisiteStore } from "./store";
import { DoorMesh } from "./DoorMesh";
import { HUD } from "./HUD";
import type { Door, Waypoint } from "./types";

type Props = { floor: string };

export function Gallery3D({ floor }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { doors, waypoints, isLoading } = useGalleryData(floor);
  const navigate = useNavigate();
  const setCurrent = useVisiteStore((s) => s.setCurrentWaypoint);
  const currentId = useVisiteStore((s) => s.currentWaypointId);

  useEffect(() => {
    if (!currentId && waypoints.length > 0) setCurrent(waypoints[0].id);
  }, [waypoints, currentId, setCurrent]);

  // Effective waypoints: a waypoint becomes unlocked when its gating door is open.
  const openedDoors = useVisiteStore((s) => s.openedDoors);
  const effectiveWaypoints: Waypoint[] = useMemo(
    () =>
      waypoints.map((w) =>
        w.locked && w.doorId && openedDoors.has(w.doorId) ? { ...w, locked: false } : w
      ),
    [waypoints, openedDoors]
  );

  function handleDoorOpened(_door: Door) {
    // unlock gating handled via store/openedDoors
  }
  function handleEnterRoom(door: Door) {
    navigate({ to: "/salle/$slug", params: { slug: door.slug } });
  }

  if (!mounted) {
    return <div className="h-[calc(100vh-3.5rem)] bg-[#EDE9E1]" aria-hidden />;
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-[#EDE9E1]">
      <Canvas
        dpr={[1, 2]}
        shadows={false}
        camera={{ position: [0, 1.65, 0], fov: 62, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#EDE9E1"]} />
        <fog attach="fog" args={["#EDE9E1", 18, 55]} />

        {/* Lighting — bright museum gallery */}
        <ambientLight intensity={1.9} />
        <hemisphereLight args={["#FFFBF2", "#C9C0AE", 0.8]} />
        {/* Linear zenith strip — simulated with a couple of soft directional lights */}
        <directionalLight position={[0, 8, -10]} intensity={0.6} color="#FFFBF2" />
        <directionalLight position={[0, 8, -25]} intensity={0.5} color="#FFFBF2" />

        <Suspense fallback={null}>
          <CorridorArchitecture length={Math.max(60, doors.length * 8 + 12)} />

          {doors.map((d) => (
            <group key={d.id}>
              {/* Soft spot above each door to highlight it */}
              <pointLight position={[d.position[0] * 0.5, 3.2, d.position[2]]} intensity={0.45} color="#FFFBF2" distance={8} />
              <DoorMesh door={d} onOpened={handleDoorOpened} onEnterRoom={handleEnterRoom} />
            </group>
          ))}

          {effectiveWaypoints.map((wp) => (
            <WaypointMarker key={wp.id} waypoint={wp} />
          ))}

          <ContactShadows position={[0, 0.01, -15]} opacity={0.22} scale={40} blur={2.4} far={4} />
        </Suspense>

        <CameraRig waypoints={effectiveWaypoints} />
      </Canvas>

      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-sm bg-[#F4F1EA]/90 px-4 py-2 text-xs uppercase tracking-wider text-[#2b2218]">
            Chargement du couloir…
          </div>
        </div>
      ) : null}

      <HUD waypoints={effectiveWaypoints} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Architecture: barrel-vault corridor, stone floor, pilasters         */
/* ------------------------------------------------------------------ */
function CorridorArchitecture({ length }: { length: number }) {
  const half = length / 2;
  // Tile texture via repeated UVs would need a loader — use simple subtle grid via vertex colors? Keep clean stone color.
  return (
    <group position={[0, 0, -half + 4]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[9, length]} />
        <meshStandardMaterial color="#D9D2C4" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Stone floor joint lines (decorative thin dark strips every 2 units) */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
        <mesh
          key={`joint-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, -half + 1 + i * 2]}
        >
          <planeGeometry args={[9, 0.03]} />
          <meshBasicMaterial color="#C2B9A8" />
        </mesh>
      ))}

      {/* Left wall */}
      <mesh position={[-4.5, 2.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[length, 4.4]} />
        <meshStandardMaterial color="#EFEAE0" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Right wall */}
      <mesh position={[4.5, 2.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[length, 4.4]} />
        <meshStandardMaterial color="#EFEAE0" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Barrel-vault ceiling — half cylinder along Z */}
      <mesh position={[0, 4.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[4.5, 4.5, length, 24, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#F4F1EA" roughness={0.95} side={THREE.BackSide} />
      </mesh>

      {/* Central linear zenith light strip (emissive plane) */}
      <mesh position={[0, 4.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, length * 0.95]} />
        <meshBasicMaterial color="#FFFDF5" />
      </mesh>

      {/* Pilasters between arches every 8 units, both sides */}
      {Array.from({ length: Math.floor(length / 8) + 1 }).map((_, i) => {
        const z = -half + i * 8;
        return (
          <group key={`pil-${i}`}>
            <mesh position={[-4.45, 1.6, z]}>
              <boxGeometry args={[0.18, 3.2, 0.4]} />
              <meshStandardMaterial color="#E4DECF" roughness={0.85} />
            </mesh>
            <mesh position={[4.45, 1.6, z]}>
              <boxGeometry args={[0.18, 3.2, 0.4]} />
              <meshStandardMaterial color="#E4DECF" roughness={0.85} />
            </mesh>
          </group>
        );
      })}

      {/* Bench halfway down the corridor */}
      <group position={[0, 0, -half + length / 2]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[1.8, 0.12, 0.5]} />
          <meshStandardMaterial color="#2b2218" roughness={0.6} />
        </mesh>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} position={[x, 0.22, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.44, 12]} />
            <meshStandardMaterial color="#B08D57" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Back wall closing the corridor */}
      <mesh position={[0, 2.2, -half]}>
        <planeGeometry args={[9, 4.4]} />
        <meshStandardMaterial color="#EFEAE0" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Waypoint marker — golden disc; hidden entirely when locked          */
/* ------------------------------------------------------------------ */
function WaypointMarker({ waypoint }: { waypoint: Waypoint }) {
  const currentId = useVisiteStore((s) => s.currentWaypointId);
  const setCurrent = useVisiteStore((s) => s.setCurrentWaypoint);
  const isCurrent = waypoint.id === currentId;
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = isCurrent ? 0.6 : 0.35 + Math.sin(t * 2) * 0.1;
  });

  // CRITICAL: locked waypoints are never rendered.
  if (waypoint.locked) return null;

  return (
    <mesh
      ref={ref}
      position={[waypoint.position[0], 0.02, waypoint.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        setCurrent(waypoint.id);
      }}
    >
      <ringGeometry args={[0.25, 0.45, 32]} />
      <meshStandardMaterial
        color="#D4AF6A"
        emissive="#D4AF6A"
        emissiveIntensity={0.4}
        side={THREE.DoubleSide}
        transparent
        opacity={isCurrent ? 1 : 0.85}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig: drag-look (yaw/pitch + inertia) + waypoint travel       */
/* ------------------------------------------------------------------ */
function CameraRig({ waypoints }: { waypoints: Waypoint[] }) {
  const { camera, gl } = useThree();
  const currentId = useVisiteStore((s) => s.currentWaypointId);
  const fov = useVisiteStore((s) => s.fov);

  // Apply FOV
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [fov, camera]);

  // Orientation state
  const yaw = useRef(0);
  const pitch = useRef(0);
  const yawVel = useRef(0);
  const pitchVel = useRef(0);

  // Drag state
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const didDrag = useRef(false);

  // Travel state
  const target = useRef(new THREE.Vector3(0, 1.65, 0));
  const startPos = useRef(new THREE.Vector3(0, 1.65, 0));
  const travelT = useRef(1);
  const travelDuration = 0.7;

  useEffect(() => {
    const wp = waypoints.find((w) => w.id === currentId);
    if (!wp) return;
    startPos.current.copy(camera.position);
    target.current.set(wp.position[0], 1.65, wp.position[2]);
    travelT.current = 0;
  }, [currentId, waypoints, camera]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";

    function onDown(e: PointerEvent) {
      dragging.current = true;
      didDrag.current = false;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      lastT.current = performance.now();
      el.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      const now = performance.now();
      const dt = Math.max(1, now - lastT.current);
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastT.current = now;
      const sensX = 0.0042;
      const sensY = 0.0042;
      yaw.current -= dx * sensX;
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * sensY, -0.52, 0.61);
      yawVel.current = -dx * sensX * (16 / dt);
      pitchVel.current = -dy * sensY * (16 / dt);
      if (Math.hypot(e.clientX - dragStartX.current, e.clientY - dragStartY.current) > 6) {
        didDrag.current = true;
      }
    }
    function onUp(e: PointerEvent) {
      dragging.current = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    // Inertia
    if (!dragging.current) {
      yaw.current += yawVel.current;
      pitch.current = THREE.MathUtils.clamp(pitch.current + pitchVel.current, -0.52, 0.61);
      const decay = Math.exp(-delta * 6);
      yawVel.current *= decay;
      pitchVel.current *= decay;
      if (Math.abs(yawVel.current) < 0.0001) yawVel.current = 0;
      if (Math.abs(pitchVel.current) < 0.0001) pitchVel.current = 0;
    }

    // Travel interpolation
    if (travelT.current < 1) {
      travelT.current = Math.min(1, travelT.current + delta / travelDuration);
      const t = travelT.current;
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      camera.position.lerpVectors(startPos.current, target.current, e);
    }

    // Apply yaw/pitch — look forward (negative Z) relative to orientation
    const lookDir = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current)
    );
    const lookAt = camera.position.clone().add(lookDir);
    camera.lookAt(lookAt);
  });

  return null;
}
