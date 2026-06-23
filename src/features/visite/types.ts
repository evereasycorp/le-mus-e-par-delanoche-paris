export type RoomKind = "corridor" | "brand_room";
export type HotspotType = "nav" | "garmentInfo" | "brandWall";

export type Room = {
  id: string;
  kind: RoomKind;
  floor: number;
  order_index: number;
  title: string;
  panorama_url: string;
  brand_id: string | null;
  next_room_id: string | null;
  prev_room_id: string | null;
};

export type Hotspot = {
  id: string;
  room_id: string;
  type: HotspotType;
  yaw: number; // degrees, 0 = camera forward
  pitch: number; // degrees, 0 = horizon
  label: string | null;
  target_room_id: string | null;
  garment_id: string | null;
  brand_id: string | null;
  featured: boolean;
  order_index: number;
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
