import { useRef, useState, useEffect } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import type { Door } from "./types";
import { useVisiteStore } from "./store";

const HOLD_MS = 800;
const CANCEL_DISTANCE_PX = 14;

type Props = {
  door: Door;
  onOpened: (door: Door) => void;
  onEnterRoom: (door: Door) => void;
};

export function DoorMesh({ door, onOpened, onEnterRoom }: Props) {
  const isOpen = useVisiteStore((s) => s.openedDoors.has(door.id));
  const openDoor = useVisiteStore((s) => s.openDoor);
  const pivot = useRef<Group>(null);
  const [holdProgress, setHoldProgress] = useState(0);

  const holdState = useRef<{
    active: boolean;
    startedAt: number;
    startX: number;
    startY: number;
    raf: number | null;
  }>({ active: false, startedAt: 0, startX: 0, startY: 0, raf: null });

  // Animate door rotation toward target (0 closed, -1.65 rad open ≈ -95°)
  useFrame((_, delta) => {
    if (!pivot.current) return;
    const target = isOpen ? -1.65 : 0;
    const current = pivot.current.rotation.y;
    const next = current + (target - current) * Math.min(1, delta * 5);
    pivot.current.rotation.y = next;
  });

  function cancelHold() {
    if (holdState.current.raf !== null) cancelAnimationFrame(holdState.current.raf);
    holdState.current.active = false;
    holdState.current.raf = null;
    setHoldProgress(0);
  }

  function tickHold() {
    if (!holdState.current.active) return;
    const elapsed = performance.now() - holdState.current.startedAt;
    const p = Math.min(1, elapsed / HOLD_MS);
    setHoldProgress(p);
    if (p >= 1) {
      holdState.current.active = false;
      holdState.current.raf = null;
      openDoor(door.id);
      onOpened(door);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(20); } catch { /* ignore */ }
      }
      return;
    }
    holdState.current.raf = requestAnimationFrame(tickHold);
  }

  useEffect(() => () => cancelHold(), []);

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (isOpen) {
      onEnterRoom(door);
      return;
    }
    holdState.current = {
      active: true,
      startedAt: performance.now(),
      startX: e.clientX,
      startY: e.clientY,
      raf: null,
    };
    setHoldProgress(0);
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    holdState.current.raf = requestAnimationFrame(tickHold);
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    if (!holdState.current.active) return;
    const dx = e.clientX - holdState.current.startX;
    const dy = e.clientY - holdState.current.startY;
    if (Math.hypot(dx, dy) > CANCEL_DISTANCE_PX) cancelHold();
  }

  function handlePointerUp() {
    if (holdState.current.active) cancelHold();
  }

  return (
    <group position={door.position} rotation={[0, door.rotationY, 0]}>
      {/* Door frame (gold) */}
      <mesh position={[0, 1.4, 0.02]}>
        <boxGeometry args={[1.6, 2.9, 0.08]} />
        <meshStandardMaterial color="#B08D57" metalness={0.55} roughness={0.35} />
      </mesh>

      {/* Door panel pivoting on its hinge (left edge) */}
      <group position={[-0.7, 0, 0.05]}>
        <group ref={pivot} position={[0.7, 0, 0]}>
          <mesh
            position={[0, 1.35, 0]}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={cancelHold}
            onPointerLeave={() => holdState.current.active && cancelHold()}
          >
            <boxGeometry args={[1.4, 2.7, 0.06]} />
            <meshStandardMaterial color="#3a2e22" roughness={0.7} metalness={0.05} />
          </mesh>
          {/* Inner panel detail */}
          <mesh position={[0, 1.35, 0.035]}>
            <boxGeometry args={[1.1, 2.3, 0.01]} />
            <meshStandardMaterial color="#2b2218" roughness={0.8} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.5, 1.3, 0.06]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color="#D4AF6A" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Cartel under the door */}
      <Html
        position={[0, -0.15, 0.12]}
        center
        distanceFactor={8}
        transform
        occlude={false}
        style={{ pointerEvents: "none" }}
      >
        <div className="rounded-sm border border-[#B08D57]/60 bg-[#F4F1EA] px-3 py-1.5 text-center shadow-sm">
          <div className="font-display text-[11px] text-[#2b2218]">{door.brandName}</div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-[#B08D57]">
            Score · {door.score.toLocaleString("fr-FR")}
          </div>
        </div>
      </Html>

      {/* Hold-to-open progress ring (visible only while pressing) */}
      {holdProgress > 0 && holdProgress < 1 && (
        <Html position={[0, 1.3, 0.15]} center style={{ pointerEvents: "none" }}>
          <svg width={56} height={56} viewBox="0 0 56 56">
            <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(176,141,87,0.25)" strokeWidth={3} />
            <circle
              cx={28}
              cy={28}
              r={24}
              fill="none"
              stroke="#D4AF6A"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - holdProgress)}
              transform="rotate(-90 28 28)"
            />
          </svg>
        </Html>
      )}
    </group>
  );
}
