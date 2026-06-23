import { create } from "zustand";

type Sheet =
  | { kind: "none" }
  | { kind: "garment"; garmentId: string }
  | { kind: "brand"; brandId: string };

type VisiteState = {
  currentRoomId: string | null;
  activeBrandId: string | null;
  sheet: Sheet;
  setRoom: (id: string) => void;
  setActiveBrand: (id: string | null) => void;
  openGarment: (id: string) => void;
  openBrand: (id: string) => void;
  closeSheet: () => void;
};

export const useVisiteStore = create<VisiteState>((set) => ({
  currentRoomId: null,
  activeBrandId: null,
  sheet: { kind: "none" },
  setRoom: (id) => set({ currentRoomId: id }),
  setActiveBrand: (id) => set({ activeBrandId: id }),
  openGarment: (id) => set({ sheet: { kind: "garment", garmentId: id } }),
  openBrand: (id) => set({ sheet: { kind: "brand", brandId: id } }),
  closeSheet: () => set({ sheet: { kind: "none" } }),
}));
