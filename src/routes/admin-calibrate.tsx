import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, ArrowLeft, Info, Building2, ArrowRight as ArrowRightIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PanoramaScene } from "@/features/visite/PanoramaScene";
import { useVisiteStore } from "@/features/visite/store";
import { project, unproject, degToRad, radToDeg } from "@/features/visite/projection";
import { resolvePanoramaUrl } from "@/features/visite/panoramas";
import type { Hotspot, Room } from "@/features/visite/types";

export const Route = createFileRoute("/admin-calibrate")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ roomId: (s.roomId as string) ?? "" }),
  head: () => ({ meta: [{ title: "Calibration hotspots — Cabinet" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CalibratePage,
});

function CalibratePage() {
  const { roomId } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();
      if (!cancelled) setStatus(data ? "ok" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  const roomsQuery = useQuery({
    queryKey: ["calibrate", "rooms"],
    enabled: status === "ok",
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Room[];
    },
  });

  const hotspotsQuery = useQuery({
    queryKey: ["calibrate", "hotspots", roomId],
    enabled: status === "ok" && !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotspots")
        .select("*")
        .eq("room_id", roomId)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Hotspot[];
    },
  });

  // Editable local copy
  const [draft, setDraft] = useState<Hotspot[]>([]);
  useEffect(() => {
    if (hotspotsQuery.data) setDraft(hotspotsQuery.data.map((h) => ({ ...h })));
  }, [hotspotsQuery.data]);

  const room = roomsQuery.data?.find((r) => r.id === roomId);
  const panoramaUrl = resolvePanoramaUrl(room?.panorama_url);

  // Camera control
  const yaw = useVisiteStore((s) => s.yaw);
  const pitch = useVisiteStore((s) => s.pitch);
  const fov = useVisiteStore((s) => s.fov);
  const setOrientation = useVisiteStore((s) => s.setOrientation);
  const setFov = useVisiteStore((s) => s.setFov);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Pan camera with drag on empty area
  const cameraDrag = useRef<{ active: boolean; lx: number; ly: number; moved: number }>({
    active: false,
    lx: 0,
    ly: 0,
    moved: 0,
  });
  const draggingHotspotId = useRef<string | null>(null);

  function onScenePointerDown(e: React.PointerEvent) {
    if (draggingHotspotId.current) return;
    cameraDrag.current = { active: true, lx: e.clientX, ly: e.clientY, moved: 0 };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onScenePointerMove(e: React.PointerEvent) {
    if (draggingHotspotId.current) {
      // Drag selected hotspot under cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { yawRad, pitchRad } = unproject(px, py, yaw, pitch, fov, rect.width, rect.height);
      setDraft((d) =>
        d.map((h) =>
          h.id === draggingHotspotId.current
            ? { ...h, yaw: radToDeg(yawRad), pitch: radToDeg(pitchRad) }
            : h,
        ),
      );
      return;
    }
    if (!cameraDrag.current.active) return;
    const dx = e.clientX - cameraDrag.current.lx;
    const dy = e.clientY - cameraDrag.current.ly;
    cameraDrag.current.moved += Math.hypot(dx, dy);
    const w = size.w || 1;
    const h = size.h || 1;
    const fovRad = degToRad(fov);
    setOrientation(yaw - (dx / w) * fovRad * (w / h), pitch - (dy / h) * fovRad);
    cameraDrag.current.lx = e.clientX;
    cameraDrag.current.ly = e.clientY;
  }
  function onScenePointerUp() {
    cameraDrag.current.active = false;
    draggingHotspotId.current = null;
  }

  async function saveAll() {
    if (!roomId) return;
    const updates = draft.map((h) =>
      supabase.from("hotspots").update({ yaw: h.yaw, pitch: h.pitch }).eq("id", h.id),
    );
    const results = await Promise.all(updates);
    const failed = results.filter((r) => r.error);
    if (failed.length) {
      toast.error(`${failed.length} mise à jour(s) en échec`);
      console.error(failed.map((r) => r.error));
    } else {
      toast.success("Positions sauvegardées");
      qc.invalidateQueries({ queryKey: ["calibrate", "hotspots", roomId] });
      qc.invalidateQueries({ queryKey: ["visite", "hotspots", roomId] });
    }
  }

  const projected = useMemo(() => {
    return draft.map((h) => ({
      h,
      ...project(degToRad(h.yaw), degToRad(h.pitch), yaw, pitch, fov, size.w, size.h),
    }));
  }, [draft, yaw, pitch, fov, size]);

  if (loading || status === "checking") {
    return <main className="min-h-screen flex items-center justify-center bg-background text-foreground/60">Vérification…</main>;
  }
  if (status === "denied") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-serif text-2xl">Accès réservé</h1>
        <Link to="/" className="text-sm underline">Retour au Hall</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1a1612] text-[#F4F1EA]">
      <header className="flex items-center justify-between border-b border-[#B08D57]/30 bg-[#231d17] px-4 py-3">
        <Link to="/admin" className="flex items-center gap-2 text-xs uppercase tracking-wider hover:text-[#B08D57]">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="text-xs uppercase tracking-wider text-[#B08D57]">Calibration hotspots</div>
        <button
          onClick={saveAll}
          disabled={!roomId || draft.length === 0}
          className="flex items-center gap-2 rounded-sm bg-[#B08D57] px-3 py-1.5 text-xs uppercase tracking-wider text-[#1a1612] transition hover:bg-[#9c7a48] disabled:opacity-30"
        >
          <Save className="h-4 w-4" /> Sauvegarder
        </button>
      </header>

      <div className="flex flex-col gap-2 border-b border-[#B08D57]/20 px-4 py-3 md:flex-row md:items-center">
        <label className="text-xs uppercase tracking-wider text-[#B08D57]">Salle :</label>
        <select
          value={roomId}
          onChange={(e) => navigate({ to: "/admin-calibrate", search: { roomId: e.target.value } })}
          className="rounded-sm bg-[#231d17] px-2 py-1 text-sm"
        >
          <option value="">— choisir —</option>
          {roomsQuery.data?.map((r) => (
            <option key={r.id} value={r.id}>
              [{r.kind}] {r.title}
            </option>
          ))}
        </select>
        <div className="text-xs text-[#F4F1EA]/60 md:ml-4">
          Glisser un hotspot pour le repositionner. Glisser le décor pour orienter la caméra. Molette = zoom.
        </div>
      </div>

      {!roomId ? (
        <div className="p-10 text-center text-[#F4F1EA]/60">Sélectionne une salle pour commencer.</div>
      ) : (
        <div
          ref={containerRef}
          className="relative h-[calc(100vh-9rem)] touch-none select-none overflow-hidden bg-black"
          onPointerDown={onScenePointerDown}
          onPointerMove={onScenePointerMove}
          onPointerUp={onScenePointerUp}
          onPointerCancel={onScenePointerUp}
          onWheel={(e) => setFov(fov + (e.deltaY > 0 ? 4 : -4))}
        >
          <PanoramaScene panoramaUrl={panoramaUrl} preloadUrls={[]} />
          <div className="pointer-events-none absolute inset-0 z-10">
            {projected.map(({ h, x, y, visible }) =>
              !visible ? null : (
                <div
                  key={h.id}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                  style={{ left: x, top: y }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    draggingHotspotId.current = h.id;
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    draggingHotspotId.current = null;
                  }}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-lg ${
                      h.type === "nav"
                        ? "border-blue-400 bg-blue-500/80 text-white"
                        : h.type === "brandWall"
                        ? "border-amber-400 bg-amber-500/80 text-white"
                        : "border-emerald-400 bg-emerald-500/80 text-white"
                    }`}
                  >
                    {h.type === "nav" ? <ArrowRightIcon className="h-4 w-4" /> : h.type === "brandWall" ? <Building2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  </div>
                  <div className="mt-1 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-center text-[10px]">
                    {h.type} · y{h.yaw.toFixed(1)}° p{h.pitch.toFixed(1)}°
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </main>
  );
}
