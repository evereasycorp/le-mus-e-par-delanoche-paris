import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Lock } from "lucide-react";
import type { Waypoint } from "./types";
import { useVisiteStore } from "./store";

type Props = {
  waypoints: Waypoint[];
};

export function HUD({ waypoints }: Props) {
  const currentId = useVisiteStore((s) => s.currentWaypointId);
  const setCurrent = useVisiteStore((s) => s.setCurrentWaypoint);
  const zoomIn = useVisiteStore((s) => s.zoomIn);
  const zoomOut = useVisiteStore((s) => s.zoomOut);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const visible = waypoints; // include locked (shown grayed in film)
  const unlocked = waypoints.filter((w) => !w.locked);
  const currentIndexInUnlocked = unlocked.findIndex((w) => w.id === currentId);
  const prev = currentIndexInUnlocked > 0 ? unlocked[currentIndexInUnlocked - 1] : null;
  const next =
    currentIndexInUnlocked >= 0 && currentIndexInUnlocked < unlocked.length - 1
      ? unlocked[currentIndexInUnlocked + 1]
      : null;

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* user-gesture or unsupported */
    }
  }

  return (
    <>
      {/* Top-right zoom + fullscreen */}
      <div className="pointer-events-auto absolute right-3 top-3 z-20 flex gap-1.5">
        <button
          onClick={zoomIn}
          className="h-9 w-9 rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] backdrop-blur transition hover:bg-[#F4F1EA]"
          aria-label="Zoom avant"
        >
          <Plus className="mx-auto h-4 w-4" />
        </button>
        <button
          onClick={zoomOut}
          className="h-9 w-9 rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] backdrop-blur transition hover:bg-[#F4F1EA]"
          aria-label="Zoom arrière"
        >
          <Minus className="mx-auto h-4 w-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="h-9 w-9 rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] backdrop-blur transition hover:bg-[#F4F1EA]"
          aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          <Maximize2 className="mx-auto h-4 w-4" />
        </button>
      </div>

      {/* Bottom: arrows + thumbnail film */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-3">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2">
          <button
            onClick={() => prev && setCurrent(prev.id)}
            disabled={!prev}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] transition disabled:opacity-30"
            aria-label="Point précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-1 gap-1.5 overflow-x-auto rounded-sm border border-[#B08D57]/30 bg-[#F4F1EA]/85 p-1.5 backdrop-blur scrollbar-none">
            {visible.map((wp) => {
              const isCurrent = wp.id === currentId;
              return (
                <button
                  key={wp.id}
                  onClick={() => !wp.locked && setCurrent(wp.id)}
                  disabled={wp.locked}
                  className={`relative flex h-10 shrink-0 items-center gap-1 rounded-sm px-2 text-[10px] uppercase tracking-wider transition ${
                    isCurrent
                      ? "bg-[#B08D57] text-[#F4F1EA]"
                      : wp.locked
                      ? "bg-[#D9D2C4] text-[#8a8378]"
                      : "bg-white/70 text-[#2b2218] hover:bg-white"
                  }`}
                  title={wp.label}
                >
                  {wp.locked && <Lock className="h-3 w-3" />}
                  <span className="max-w-[80px] truncate">{wp.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => next && setCurrent(next.id)}
            disabled={!next}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] transition disabled:opacity-30"
            aria-label="Point suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
