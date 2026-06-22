export type Waypoint = {
  id: string;
  position: [number, number, number];
  locked: boolean;
  label: string;
  doorId?: string; // door that gates this waypoint
};

export type Door = {
  id: string;
  slug: string;
  brandName: string;
  score: number;
  position: [number, number, number];
  rotationY: number; // 0 = facing center; +/- PI/2 for side walls
  side: "left" | "right";
  opened: boolean;
  unlocksWaypoints: string[];
};

export type Garment = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  price: number; // cents
  position: [number, number, number];
  thumbnail: string;
};
