import { create } from "zustand";

export const useDropletsStore = create((set) => ({
  resetDroplets: false,
  setResetDroplets: () => set((state) => ({ ...state, resetDroplets: !state.resetDroplets })),
  droplets: [],
  setDroplets: (droplets) => set({ droplets }),
}));
