import { create } from "zustand";

export const useModelStore = create((set) => ({
	model: "flux",
	setModel: (model) => set({ model })
}));
