import { create } from "zustand";

/**
 * Editor-wide preference: which renderer the canvas should use.
 *
 *   - `legacy`  → the original `LayerView` family. Source of truth before
 *                 the scene model was introduced; still used by default.
 *   - `scene`   → the pilot `SceneRendererView` driven by the new scene
 *                 model. Behaves identically for shipped templates but
 *                 may diverge for new node types.
 *
 * The flag persists in `localStorage` so the choice survives reloads. The
 * URL params `?scene=1` / `?scene=0` still work as one-shot overrides — they
 * are read on init and then mirrored back into this store.
 */

const FLAG_KEY = "coverly-scene";

const readInitial = () => {
  if (typeof window === "undefined") return false;
  try {
    const qp = new URLSearchParams(window.location.search).get("scene");
    if (qp === "1") {
      window.localStorage.setItem(FLAG_KEY, "1");
      return true;
    }
    if (qp === "0") {
      window.localStorage.setItem(FLAG_KEY, "0");
      return false;
    }
    return window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
};

export const useRendererStore = create((set, get) => ({
  useSceneRenderer: readInitial(),

  setUseSceneRenderer: (value) => {
    const next = !!value;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(FLAG_KEY, next ? "1" : "0");
      } catch {
        /* localStorage unavailable — keep in-memory only */
      }
    }
    set({ useSceneRenderer: next });
  },

  toggleSceneRenderer: () => get().setUseSceneRenderer(!get().useSceneRenderer),
}));
