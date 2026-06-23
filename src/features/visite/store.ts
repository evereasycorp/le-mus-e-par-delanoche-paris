import { create } from "zustand";

type Sheet =
  | { kind: "none" }
  | { kind: "garment"; garmentId: string }
  | { kind: "brand"; brandId: string };

type VisiteState = {
  currentRoomId: string | null;
  yaw: number; // radians
  pitch: number; // radians
  fov: number; // degrees
  isTransitioning: boolean;
  sheet: Sheet;

  setRoom: (id: string) => void;
  setOrientation: (yaw: number, pitch: number) => void;
  setFov: (fov: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  beginTransition: () => void;
  endTransition: () => void;
  openGarment: (id: string) => void;
  openBrand: (id: string) => void;
  closeSheet: () => void;
};

const FOV_MIN = 35;
const FOV_MAX = 85;
const FOV_DEFAULT = 70;
const PITCH_LIMIT = Math.PI / 2 - 0.05;

export const useVisiteStore = create<VisiteState>((set) => ({
  currentRoomId: null,
  yaw: 0,
  pitch: 0,
  fov: FOV_DEFAULT,
  isTransitioning: false,
  sheet: { kind: "none" },
  setRoom: (id) => set({ currentRoomId: id, yaw: 0, pitch: 0 }),
  setOrientation: (yaw, pitch) =>
    set({ yaw, pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch)) }),
  setFov: (fov) => set({ fov: Math.max(FOV_MIN, Math.min(FOV_MAX, fov)) }),
  zoomIn: () => set((s) => ({ fov: Math.max(FOV_MIN, s.fov - 6) })),
  zoomOut: () => set((s) => ({ fov: Math.min(FOV_MAX, s.fov + 6) })),
  beginTransition: () => set({ isTransitioning: true }),
  endTransition: () => set({ isTransitioning: false }),
  openGarment: (id) => set({ sheet: { kind: "garment", garmentId: id } }),
  openBrand: (id) => set({ sheet: { kind: "brand", brandId: id } }),
  closeSheet: () => set({ sheet: { kind: "none" } }),
}));
