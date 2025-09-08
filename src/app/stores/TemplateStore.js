import { create } from "zustand";

export const useTemplateStore = create((set) => ({
	template: null,
	setTemplate: (template) => set({ template })
}));
