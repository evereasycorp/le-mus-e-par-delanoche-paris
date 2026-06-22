import { create } from "zustand";

type VisiteState = {
  currentWaypointId: string | null;
  openedDoors: Set<string>;
  fov: number;
  setCurrentWaypoint: (id: string) => void;
  openDoor: (id: string) => void;
  isDoorOpen: (id: string) => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

const FOV_MIN = 40;
const FOV_MAX = 80;
const FOV_DEFAULT = 62;

export const useVisiteStore = create<VisiteState>((set, get) => ({
  currentWaypointId: null,
  openedDoors: new Set<string>(),
  fov: FOV_DEFAULT,
  setCurrentWaypoint: (id) => set({ currentWaypointId: id }),
  openDoor: (id) =>
    set((s) => {
      const next = new Set(s.openedDoors);
      next.add(id);
      return { openedDoors: next };
    }),
  isDoorOpen: (id) => get().openedDoors.has(id),
  zoomIn: () => set((s) => ({ fov: Math.max(FOV_MIN, s.fov - 6) })),
  zoomOut: () => set((s) => ({ fov: Math.min(FOV_MAX, s.fov + 6) })),
  reset: () => set({ currentWaypointId: null, openedDoors: new Set(), fov: FOV_DEFAULT }),
}));
