import { create } from "zustand";

export const useModelStore = create((set) => ({
	model: "gemini",
	setModel: (model) => set({ model })
}));
