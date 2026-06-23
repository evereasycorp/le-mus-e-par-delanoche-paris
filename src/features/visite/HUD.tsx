import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useVisiteStore } from "./store";
import type { Room } from "./types";

export function HUD({
  currentRoom,
  rooms,
  onGoToRoom,
}: {
  currentRoom: Room | null;
  rooms: Room[];
  onGoToRoom: (roomId: string) => void;
}) {
  const zoomIn = useVisiteStore((s) => s.zoomIn);
  const zoomOut = useVisiteStore((s) => s.zoomOut);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  async function toggleFs() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* unsupported */
    }
  }

  const prev = currentRoom?.prev_room_id ?? null;
  const next = currentRoom?.next_room_id ?? null;

  return (
    <>
      {/* Top-right zoom + fullscreen */}
      <div className="pointer-events-auto absolute right-3 top-3 z-30 flex gap-1.5">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] backdrop-blur transition hover:bg-[#F4F1EA]"
          aria-label="Accueil"
        >
          <Home className="h-4 w-4" />
        </Link>
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
          onClick={toggleFs}
          className="h-9 w-9 rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] backdrop-blur transition hover:bg-[#F4F1EA]"
          aria-label={fs ? "Quitter le plein écran" : "Plein écran"}
        >
          <Maximize2 className="mx-auto h-4 w-4" />
        </button>
      </div>

      {/* Top-center: current room name */}
      {currentRoom && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 px-4 py-1.5 text-center backdrop-blur">
          <div className="text-[9px] uppercase tracking-wider text-[#B08D57]">
            {currentRoom.kind === "corridor" ? "Couloir" : "Salle"}
          </div>
          <div className="font-serif text-sm text-[#2b2218]">{currentRoom.title}</div>
        </div>
      )}

      {/* Bottom: arrows + film */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-3">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2">
          <button
            onClick={() => prev && onGoToRoom(prev)}
            disabled={!prev}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] transition disabled:opacity-30"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="scrollbar-none flex flex-1 gap-1.5 overflow-x-auto rounded-sm border border-[#B08D57]/30 bg-[#F4F1EA]/85 p-1.5 backdrop-blur">
            {rooms.map((r) => {
              const active = r.id === currentRoom?.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onGoToRoom(r.id)}
                  className={`relative flex h-10 shrink-0 items-center gap-1 rounded-sm px-2 text-[10px] uppercase tracking-wider transition ${
                    active
                      ? "bg-[#B08D57] text-[#F4F1EA]"
                      : "bg-white/70 text-[#2b2218] hover:bg-white"
                  }`}
                  title={r.title}
                >
                  {r.title.length > 14 ? r.title.slice(0, 14) + "…" : r.title}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => next && onGoToRoom(next)}
            disabled={!next}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[#B08D57]/40 bg-[#F4F1EA]/90 text-[#2b2218] transition disabled:opacity-30"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
