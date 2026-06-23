import { useEffect, useMemo, useRef, useState } from "react";
import { Info, ArrowRight, Building2 } from "lucide-react";
import { useVisiteStore } from "./store";
import { project, degToRad } from "./projection";
import type { Hotspot, BrandLite } from "./types";

type Cluster = {
  cx: number;
  cy: number;
  items: Array<Hotspot & { sx: number; sy: number }>;
};

const TOUCH_SIZE = 44;
const CLUSTER_THRESHOLD = 30;

export function HotspotLayer({
  hotspots,
  brandsById,
  containerRef,
  onActivateHotspot,
  isInteractive,
}: {
  hotspots: Hotspot[];
  brandsById: Map<string, BrandLite>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onActivateHotspot: (h: Hotspot) => void;
  isInteractive: boolean;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [fov, setFov] = useState(70);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    obs.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const tick = () => {
      const s = useVisiteStore.getState();
      setYaw(s.yaw);
      setPitch(s.pitch);
      setFov(s.fov);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { clusters, projected } = useMemo(() => {
    const proj = hotspots.map((h) => ({
      h,
      ...project(degToRad(h.yaw), degToRad(h.pitch), yaw, pitch, fov, size.w, size.h),
    }));
    const visible = proj.filter((p) => p.visible);
    // Greedy clustering
    const used = new Set<number>();
    const clusters: Cluster[] = [];
    visible.forEach((p, i) => {
      if (used.has(i)) return;
      const group: Cluster = { cx: p.x, cy: p.y, items: [{ ...p.h, sx: p.x, sy: p.y }] };
      used.add(i);
      visible.forEach((q, j) => {
        if (i === j || used.has(j)) return;
        if (Math.hypot(p.x - q.x, p.y - q.y) < CLUSTER_THRESHOLD) {
          group.items.push({ ...q.h, sx: q.x, sy: q.y });
          used.add(j);
        }
      });
      // Average cluster center
      group.cx = group.items.reduce((a, b) => a + b.sx, 0) / group.items.length;
      group.cy = group.items.reduce((a, b) => a + b.sy, 0) / group.items.length;
      clusters.push(group);
    });
    return { clusters, projected: proj };
  }, [hotspots, yaw, pitch, fov, size]);

  // Highlight nearest nav hotspot (cône ±15°)
  const highlightedNavId = useMemo<string | null>(() => {
    let bestId: string | null = null;
    let bestAngle = Infinity;
    projected.forEach(({ h }) => {
      if (h.type !== "nav") return;
      const rel = Math.abs(((degToRad(h.yaw) - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (rel < degToRad(15) && rel < bestAngle) {
        bestId = h.id;
        bestAngle = rel;
      }
    });
    return bestId;
  }, [projected, yaw]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ pointerEvents: isInteractive ? undefined : "none" }}
    >
      {clusters.map((cluster, idx) => {
        if (cluster.items.length === 1 || expandedCluster === idx) {
          return cluster.items.map((item) => (
            <HotspotMarker
              key={item.id}
              hotspot={item}
              x={item.sx}
              y={item.sy}
              brand={item.brand_id ? brandsById.get(item.brand_id) : undefined}
              highlighted={item.id === highlightedNavId}
              onClick={() => {
                setExpandedCluster(null);
                onActivateHotspot(item);
              }}
              interactive={isInteractive}
            />
          ));
        }
        return (
          <button
            key={`cluster-${idx}`}
            className="pointer-events-auto absolute flex items-center justify-center rounded-full border-2 border-[#B08D57] bg-[#F4F1EA]/95 text-[#2b2218] shadow-lg backdrop-blur transition hover:scale-110"
            style={{
              left: cluster.cx - TOUCH_SIZE / 2,
              top: cluster.cy - TOUCH_SIZE / 2,
              width: TOUCH_SIZE,
              height: TOUCH_SIZE,
            }}
            onClick={() => setExpandedCluster(idx)}
            aria-label={`Voir les ${cluster.items.length} éléments`}
            disabled={!isInteractive}
          >
            <span className="text-sm font-medium">+{cluster.items.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function HotspotMarker({
  hotspot,
  x,
  y,
  brand,
  highlighted,
  onClick,
  interactive,
}: {
  hotspot: Hotspot;
  x: number;
  y: number;
  brand?: BrandLite;
  highlighted: boolean;
  onClick: () => void;
  interactive: boolean;
}) {
  const isNav = hotspot.type === "nav";
  const isBrand = hotspot.type === "brandWall";
  const Icon = isNav ? ArrowRight : isBrand ? Building2 : Info;
  const visualSize = hotspot.featured ? 36 : 28;
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: x - TOUCH_SIZE / 2, top: y - TOUCH_SIZE / 2 }}
    >
      <button
        onClick={onClick}
        disabled={!interactive}
        className="pointer-events-auto flex items-center justify-center rounded-full transition-transform hover:scale-110"
        style={{ width: TOUCH_SIZE, height: TOUCH_SIZE }}
        aria-label={hotspot.label ?? "Point d'intérêt"}
      >
        <span
          className={`flex items-center justify-center rounded-full border-2 transition-all ${
            highlighted
              ? "border-[#B08D57] bg-[#B08D57] text-[#F4F1EA] shadow-[0_0_24px_rgba(176,141,87,0.7)]"
              : "border-[#B08D57]/70 bg-[#F4F1EA]/90 text-[#2b2218] shadow-md backdrop-blur"
          }`}
          style={{ width: visualSize, height: visualSize }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </button>
      {isNav && brand && (
        <div
          className={`pointer-events-none absolute left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/95 px-3 py-1 text-center transition-opacity duration-300 ${
            highlighted ? "opacity-100" : "opacity-0"
          }`}
          style={{ top: TOUCH_SIZE }}
        >
          <div className="font-serif text-xs text-[#2b2218]">{brand.name}</div>
          <div className="text-[9px] uppercase tracking-wider text-[#B08D57]">
            Score {Math.round(brand.rank_score)}
          </div>
        </div>
      )}
    </div>
  );
}
