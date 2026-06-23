import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Hotspot, Room } from "@/features/visite/types";

export const Route = createFileRoute("/admin-calibrate")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ roomId: (s.roomId as string) ?? "" }),
  head: () => ({
    meta: [
      { title: "Calibration hotspots — Cabinet" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
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

  const [draft, setDraft] = useState<Hotspot[]>([]);
  useEffect(() => {
    if (hotspotsQuery.data) setDraft(hotspotsQuery.data.map((h) => ({ ...h })));
  }, [hotspotsQuery.data]);

  const dirty = useMemo(() => {
    if (!hotspotsQuery.data) return false;
    return draft.some((h, i) => {
      const src = hotspotsQuery.data![i];
      return !src || src.yaw !== h.yaw || src.pitch !== h.pitch;
    });
  }, [draft, hotspotsQuery.data]);

  async function saveAll() {
    for (const h of draft) {
      const { error } = await supabase
        .from("hotspots")
        .update({ yaw: h.yaw, pitch: h.pitch })
        .eq("id", h.id);
      if (error) {
        toast.error(`Échec sauvegarde : ${error.message}`);
        return;
      }
    }
    toast.success("Hotspots enregistrés");
    qc.invalidateQueries({ queryKey: ["calibrate", "hotspots", roomId] });
    qc.invalidateQueries({ queryKey: ["visite"] });
  }

  if (loading || status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Vérification…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Accès refusé.{" "}
        <Link to="/" className="ml-2 underline">
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] p-6 text-[#2b2218]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm text-[#B08D57] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Cabinet
          </Link>
          <h1 className="font-serif text-2xl">Calibration des hotspots</h1>
          <button
            disabled={!dirty}
            onClick={saveAll}
            className="inline-flex items-center gap-2 rounded-sm border border-[#B08D57] bg-[#B08D57] px-3 py-2 text-sm text-[#F4F1EA] disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Enregistrer
          </button>
        </div>

        <label className="block text-xs uppercase tracking-wider text-[#B08D57]">Scène</label>
        <select
          value={roomId}
          onChange={(e) => navigate({ to: "/admin-calibrate", search: { roomId: e.target.value } })}
          className="mt-1 w-full rounded-sm border border-[#B08D57]/40 bg-white p-2 text-sm"
        >
          <option value="">— Choisir —</option>
          {roomsQuery.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} ({r.slug ?? r.kind})
            </option>
          ))}
        </select>

        {roomId && (
          <div className="mt-6 space-y-3">
            <p className="text-xs text-[#2b2218]/70">
              Modifie ici les coordonnées (yaw : -180→180, pitch : -90→90) de chaque hotspot. Astuce
              : pour repérer la position visuelle voulue, ouvre la scène dans /etage/1,
              positionne-toi face à l'objet, puis note l'angle.
            </p>
            {draft.map((h, i) => (
              <div
                key={h.id}
                className="grid grid-cols-12 items-center gap-2 rounded-sm border border-[#B08D57]/30 bg-white/60 p-3 text-sm"
              >
                <div className="col-span-4">
                  <div className="text-[10px] uppercase tracking-wider text-[#B08D57]">
                    {h.type}
                    {h.subtype ? ` · ${h.subtype}` : ""}
                  </div>
                  <div className="truncate font-medium">{h.label ?? "(sans titre)"}</div>
                </div>
                <label className="col-span-4 flex items-center gap-2">
                  <span className="text-xs">yaw</span>
                  <input
                    type="number"
                    step={1}
                    value={h.yaw}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDraft((d) => d.map((x, j) => (j === i ? { ...x, yaw: v } : x)));
                    }}
                    className="w-full rounded-sm border border-[#B08D57]/40 bg-white p-1"
                  />
                </label>
                <label className="col-span-4 flex items-center gap-2">
                  <span className="text-xs">pitch</span>
                  <input
                    type="number"
                    step={1}
                    value={h.pitch}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDraft((d) => d.map((x, j) => (j === i ? { ...x, pitch: v } : x)));
                    }}
                    className="w-full rounded-sm border border-[#B08D57]/40 bg-white p-1"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
