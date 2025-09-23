import { create } from "zustand";

export const useTextStore = create((set) => ({
	texts: {
		offsetY: 0
	},
	setTexts: (texts) => set({ texts })
}));
