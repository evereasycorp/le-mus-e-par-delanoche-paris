import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Room, Hotspot, BrandLite, PieceLite, BrandSocial } from "./types";

export function useRooms(floor: number) {
  return useQuery({
    queryKey: ["visite", "rooms", floor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("floor", floor)
        .eq("is_published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Room[];
    },
  });
}

export function useHotspots(roomId: string | null) {
  return useQuery({
    queryKey: ["visite", "hotspots", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotspots")
        .select("*")
        .eq("room_id", roomId!)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Hotspot[];
    },
  });
}

export function useBrands(brandIds: string[]) {
  return useQuery({
    queryKey: ["visite", "brands", brandIds.sort().join(",")],
    enabled: brandIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select(
          "id, slug, name, bio, logo_url, rank_score, is_verified, socials, display_badges",
        )
        .in("id", brandIds);
      if (error) throw error;
      return (data ?? []).map((b: Record<string, unknown>) => ({
        ...b,
        socials: Array.isArray(b.socials) ? (b.socials as BrandSocial[]) : [],
        display_badges: Array.isArray(b.display_badges) ? (b.display_badges as string[]) : [],
      })) as BrandLite[];
    },
  });
}

export function usePieces(pieceIds: string[]) {
  return useQuery({
    queryKey: ["visite", "pieces", pieceIds.sort().join(",")],
    enabled: pieceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pieces")
        .select("id, brand_id, name, description, price_cents, currency, photos")
        .in("id", pieceIds);
      if (error) throw error;
      return (data ?? []) as unknown as PieceLite[];
    },
  });
}
