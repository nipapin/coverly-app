import { create } from "zustand";

export const useTransformerStore = create((set) => ({
	transformer: null,
	setTransformer: (transformer) => set({ transformer })
}));
