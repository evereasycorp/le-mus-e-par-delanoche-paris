export type RoomKind = "entrance" | "corridor" | "salle";
export type HotspotType = "nav" | "garmentInfo" | "brandWall";

export type Room = {
  id: string;
  slug: string | null;
  kind: RoomKind;
  floor: number;
  order_index: number;
  title: string;
  panorama_url: string;
  next_room_id: string | null;
  prev_room_id: string | null;
};

export type Hotspot = {
  id: string;
  room_id: string;
  type: HotspotType;
  yaw: number;
  pitch: number;
  label: string | null;
  target_room_id: string | null;
  garment_id: string | null;
  brand_id: string | null;
  featured: boolean;
  order_index: number;
  slot_index: number | null;
  subtype: string | null;
};

export type SalleBrand = {
  id: string;
  salle_id: string;
  brand_id: string | null;
  slot_index: number;
  is_demo: boolean;
};

export type BrandSocial = { platform: "instagram" | "tiktok" | "website"; url: string };

export type BrandLite = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  logo_url: string | null;
  rank_score: number;
  is_verified: boolean;
  socials: BrandSocial[];
  display_badges: string[];
};

export type PieceLite = {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  photos: string[] | null;
};
