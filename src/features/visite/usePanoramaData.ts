import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Room, Hotspot, BrandLite, PieceLite, BrandSocial, SalleBrand } from "./types";

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

export function useAllHotspots(floor: number) {
  return useQuery({
    queryKey: ["visite", "hotspots", "all", floor],
    queryFn: async () => {
      // fetch hotspots for every published room on this floor in one round-trip
      const { data: rooms, error: e1 } = await supabase
        .from("rooms")
        .select("id")
        .eq("floor", floor)
        .eq("is_published", true);
      if (e1) throw e1;
      const ids = (rooms ?? []).map((r) => r.id);
      if (ids.length === 0) return [] as Hotspot[];
      const { data, error } = await supabase
        .from("hotspots")
        .select("*")
        .in("room_id", ids)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as Hotspot[];
    },
  });
}

export function useSalleBrands(floor: number) {
  return useQuery({
    queryKey: ["visite", "salle_brands", floor],
    queryFn: async () => {
      const { data: rooms, error: e1 } = await supabase
        .from("rooms")
        .select("id")
        .eq("floor", floor)
        .eq("kind", "salle")
        .eq("is_published", true);
      if (e1) throw e1;
      const ids = (rooms ?? []).map((r) => r.id);
      if (ids.length === 0) return [] as SalleBrand[];
      const { data, error } = await supabase
        .from("salle_brands")
        .select("*")
        .in("salle_id", ids)
        .order("slot_index");
      if (error) throw error;
      return (data ?? []) as unknown as SalleBrand[];
    },
  });
}

export function useBrands(brandIds: string[]) {
  return useQuery({
    queryKey: ["visite", "brands", brandIds.slice().sort().join(",")],
    enabled: brandIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, slug, name, bio, logo_url, rank_score, is_verified, socials, display_badges")
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
    queryKey: ["visite", "pieces", pieceIds.slice().sort().join(",")],
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
