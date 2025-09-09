import { create } from "zustand";

export const useTextStore = create((set) => ({
	texts: {},
	setTexts: (texts) => set({ texts })
}));
