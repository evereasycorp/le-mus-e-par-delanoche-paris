import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Door, Waypoint } from "./types";

const CATEGORY_BY_FLOOR: Record<string, string> = {
  "1": "vetements",
};

const DOOR_SPACING = 8; // z units between doors
const FIRST_DOOR_Z = -6;

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  rank_score: number;
};

export function useGalleryData(floor: string) {
  const category = CATEGORY_BY_FLOOR[floor];

  const query = useQuery({
    queryKey: ["visite", "brands", category ?? "none"],
    queryFn: async () => {
      if (!category) return [] as BrandRow[];
      const { data, error } = await supabase
        .from("brands")
        .select("id, slug, name, rank_score")
        .eq("category", category as "vetements" | "art" | "livres")
        .eq("is_published", true)
        .order("rank_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BrandRow[];
    },
  });

  const { doors, waypoints } = useMemo(() => {
    const brands = query.data ?? [];
    const doors: Door[] = brands.map((b, i) => {
      const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
      const x = side === "left" ? -3.2 : 3.2;
      const z = FIRST_DOOR_Z - i * DOOR_SPACING;
      return {
        id: b.id,
        slug: b.slug,
        brandName: b.name,
        score: Math.round(b.rank_score),
        position: [x, 0, z],
        rotationY: side === "left" ? Math.PI / 2 : -Math.PI / 2,
        side,
        opened: false,
        unlocksWaypoints: [`wp-${b.id}-room`],
      };
    });

    // Entrance waypoint + one per door (in front of it) + locked "room" waypoints behind each door.
    const waypoints: Waypoint[] = [
      { id: "wp-entrance", position: [0, 0, 0], locked: false, label: "Entrée" },
    ];
    doors.forEach((d, i) => {
      // Public corridor waypoint in front of each door — gated by previous door being opened.
      const prev = doors[i - 1];
      waypoints.push({
        id: `wp-${d.id}-front`,
        position: [0, 0, d.position[2] + 1.5],
        locked: i > 0 ? true : false,
        doorId: prev?.id,
        label: d.brandName,
      });
      // "Room" waypoint behind the door, locked until the door itself opens.
      waypoints.push({
        id: `wp-${d.id}-room`,
        position: [d.position[0] * 1.8, 0, d.position[2]],
        locked: true,
        doorId: d.id,
        label: `${d.brandName} — salle`,
      });
    });

    return { doors, waypoints };
  }, [query.data]);

  return { ...query, doors, waypoints };
}
