import { create } from "zustand";

export const useTemplateStore = create((set, get) => ({
  template: null,
  setTemplate: (template, initial = false) => {
    if (initial) {
      window.localStorage.setItem("coverly-template-history", JSON.stringify([template]));
      return set({ template });
    }

    const history = window.localStorage.getItem("coverly-template-history");
    const historyArray = history ? JSON.parse(history) : [];
    historyArray.push(template);
    window.localStorage.setItem("coverly-template-history", JSON.stringify(historyArray));
    const pathname = window.location.pathname;
    const sessionId = pathname.split("/").pop();
    fetch(`/api/workflow/save`, {
      method: "POST",
      body: JSON.stringify({ sessionId, template }),
    });
    return set({ template });
  },
}));
