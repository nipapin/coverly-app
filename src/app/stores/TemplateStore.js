import { create } from "zustand";
import { migrateLegacyTemplate, sceneToLegacyTemplate, validateScene } from "@/lib/scene";

const HISTORY_KEY = "coverly-template-history";
const HISTORY_INDEX_KEY = "coverly-template-history-index";
const MAX_HISTORY_SIZE = 50;

/**
 * Phase 0: derive a `Scene` (new model) from the legacy `template`.
 * Returns null and logs on failure — never throws — so a migration bug can't
 * crash the editor while the legacy renderer is still the source of truth.
 *
 * @param {any} template
 * @returns {import("@/lib/scene").Scene | null}
 */
const deriveSceneFromTemplate = (template) => {
  if (!template) return null;
  try {
    const scene = migrateLegacyTemplate(template, {
      projectId: typeof template.sourceProjectId === "string" ? template.sourceProjectId : undefined,
    });
    const err = validateScene(scene);
    if (err) {
      console.warn("[TemplateStore] derived scene failed validation:", err);
      return null;
    }
    return scene;
  } catch (e) {
    console.warn("[TemplateStore] failed to derive scene:", e);
    return null;
  }
};

/**
 * Phase 7: prefer a persisted scene if it travels with the template, fall back
 * to deriving one from scratch otherwise. The save endpoint embeds the scene
 * under `_scene` (see `/api/workflow/save`), so reload-after-edit can skip the
 * migration step and reuse the in-memory canonical model.
 *
 * Validation is mandatory: a corrupt persisted scene drops to derivation
 * silently, so the user never sees a broken editor because of a stale field.
 *
 * @param {any} template
 * @returns {import("@/lib/scene").Scene | null}
 */
const resolveScene = (template) => {
  if (!template) return null;
  if (template._scene) {
    const err = validateScene(template._scene);
    if (!err) return template._scene;
    console.warn("[TemplateStore] persisted scene failed validation, falling back to derive:", err);
  }
  return deriveSceneFromTemplate(template);
};

/**
 * Strip fields that bloat history snapshots without changing editor state.
 * `thumbnail` is a regenerated rendering of the canvas. `_scene` is the
 * persisted scene mirror (Phase 7); we re-derive it on restore so keeping a
 * copy in every history entry would just waste localStorage quota.
 */
const stripForHistory = (template) => {
  if (!template) return template;
  const { thumbnail, _scene, ...rest } = template;
  // discarded fields are intentionally unused
  void thumbnail;
  void _scene;
  return rest;
};

const initializeHistory = (template) => {
  if (!template || typeof window === "undefined") return;

  const history = [JSON.parse(JSON.stringify(stripForHistory(template)))];
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  window.localStorage.setItem(HISTORY_INDEX_KEY, "0");
};

export const useTemplateStore = create((set, get) => ({
  template: null,
  /**
   * Derived from `template` on every `setTemplate`. New code (Phase 1+) reads
   * from `scene`; legacy views still read `template`. Both are kept in sync
   * by this store, no caller needs to update `scene` directly.
   *
   * @type {import("@/lib/scene").Scene | null}
   */
  scene: null,
  setTemplate: (template, initial = false, save = true, saveHistory = true) => {
    if (initial) {
      // При инициализации очищаем и создаем новую историю
      initializeHistory(template);
      set({ template, scene: resolveScene(template) });
      return;
    }

    // Сохраняем в историю перед изменением (если не отключено)
    if (saveHistory && typeof window !== "undefined") {
      const historyStr = window.localStorage.getItem(HISTORY_KEY);
      const history = historyStr ? JSON.parse(historyStr) : [];
      const currentIndex = parseInt(window.localStorage.getItem(HISTORY_INDEX_KEY) || "0");

      // Если мы не в конце истории (например, после undo), удаляем все после текущего индекса
      const newHistory = history.slice(0, currentIndex + 1);

      newHistory.push(JSON.parse(JSON.stringify(stripForHistory(template))));

      // Ограничиваем размер истории
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        window.localStorage.setItem(HISTORY_INDEX_KEY, (MAX_HISTORY_SIZE - 1).toString());
      } else {
        window.localStorage.setItem(HISTORY_INDEX_KEY, (newHistory.length - 1).toString());
      }

      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    }

    // Обновляем состояние (template + производный scene в одном set).
    // We always derive a fresh scene on write — the persisted one (if any)
    // would already be stale because the template just changed.
    const derivedScene = deriveSceneFromTemplate(template);
    set({ template, scene: derivedScene });

    // Сохраняем в сессию (если не отключено)
    if (save && typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const sessionId = pathname.split("/").pop();
      // Phase 7 forward-compat: ship the derived scene alongside the legacy
      // template so future loaders can prefer the new model without a
      // migration window. The save API embeds it under `_scene` on the
      // template JSON; old readers ignore the unknown field.
      fetch(`/api/workflow/save`, {
        method: "POST",
        body: JSON.stringify({ sessionId, template, scene: derivedScene }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Saved template to session", data);
        });
    }
  },

  /**
   * Append a fresh top-level shape (rectangle) to the template. Position and
   * size are deliberately mid-canvas so the user notices the new layer.
   * Selection is up to the caller — we don't import SelectionStore here to
   * keep the dependency direction one-way.
   */
  addShape: () => {
    const cur = get().template;
    if (!cur) return null;
    const newLayer = {
      name: `shape-${Date.now()}`,
      type: "shape",
      color: "#ffffff",
      x: { value: 0.4, unit: "percent" },
      y: { value: 0.4, unit: "percent" },
      width: { value: 200, unit: "pixels" },
      height: { value: 100, unit: "pixels" },
      offset: {
        x: { value: 0, unit: "pixels" },
        y: { value: 0, unit: "pixels" },
      },
    };
    const next = { ...cur, layers: [...(cur.layers || []), newLayer] };
    get().setTemplate(next);
    return newLayer;
  },

  /**
   * Append a top-level group containing a single text child. Mirrors the
   * shape pattern so writers and Layers panel work without special-casing.
   */
  addText: () => {
    const cur = get().template;
    if (!cur) return null;
    const newLayer = {
      name: `text-${Date.now()}`,
      type: "group",
      image: "",
      x: { value: 0.35, unit: "percent" },
      y: { value: 0.45, unit: "percent" },
      width: { value: 400, unit: "pixels" },
      height: { value: 80, unit: "pixels" },
      children: [
        {
          name: `text-${Date.now()}-content`,
          type: "text",
          content: "Sample Text",
        },
      ],
    };
    const next = { ...cur, layers: [...(cur.layers || []), newLayer] };
    get().setTemplate(next);
    return newLayer;
  },

  /**
   * Canonical scene-first setter. The new scene becomes the source of truth
   * and the legacy `template` is re-synthesized from it via reverse migration.
   *
   * Use this when the writer thinks in scene-space (a transform delta on a
   * specific `node.id`) — the existing legacy code paths (Settings, droplets,
   * exports, save endpoint) keep working because the derived template carries
   * the same shape.
   *
   * @param {import("@/lib/scene").Scene} scene
   * @param {{ save?: boolean, saveHistory?: boolean }} [options]
   */
  setScene: (scene, options = {}) => {
    if (!scene) return;
    const err = validateScene(scene);
    if (err) {
      console.warn("[TemplateStore] setScene: invalid scene rejected:", err);
      return;
    }
    const cur = get().template;
    const reverseTemplate = sceneToLegacyTemplate(scene, cur);
    // Route through `setTemplate` so we get history, save, and the standard
    // re-derive path for free. The re-derived scene matches `scene` for the
    // shipped templates (verified by `test-roundtrip.mjs`).
    get().setTemplate(reverseTemplate, false, options.save !== false, options.saveHistory !== false);
  },

  /**
   * Apply a transform patch to a single node, then run the canonical
   * scene→template sync. The patch is shallow-merged onto the node's existing
   * transform — pass only the keys that changed.
   *
   * @param {string} nodeId
   * @param {Partial<import("@/lib/scene").Transform>} transformPatch
   * @param {{ save?: boolean, saveHistory?: boolean }} [options]
   * @returns {boolean} true if a node with that id was found and updated
   */
  applyScenePatch: (nodeId, transformPatch, options = {}) => {
    const scene = get().scene;
    if (!scene || !nodeId || !transformPatch || typeof transformPatch !== "object") {
      return false;
    }

    let found = false;
    const patchNode = (node) => {
      if (node.id === nodeId) {
        found = true;
        return {
          ...node,
          transform: { ...node.transform, ...transformPatch },
        };
      }
      if (node.children && node.children.length > 0) {
        const nextChildren = node.children.map(patchNode);
        if (nextChildren.some((c, i) => c !== node.children[i])) {
          return { ...node, children: nextChildren };
        }
      }
      return node;
    };

    const nextNodes = scene.nodes.map(patchNode);
    if (!found) return false;

    get().setScene({ ...scene, nodes: nextNodes }, options);
    return true;
  },

  /**
   * Remove a node by its scene id. Supports two id shapes:
   *   - "n-{i}"     → removes the i-th top-level layer.
   *   - "n-{i}-c-{j}" → removes the j-th child from the i-th layer.
   *
   * Indices of subsequent layers/children shift after removal, which would
   * invalidate path-based ids of unrelated selections. Callers should clear
   * the selection right after — the existing keyboard handler does so.
   */
  removeNodeById: (id) => {
    const cur = get().template;
    if (!cur || typeof id !== "string") return false;
    const childMatch = /^n-(\d+)-c-(\d+)$/.exec(id);
    if (childMatch) {
      const layerIdx = Number(childMatch[1]);
      const childIdx = Number(childMatch[2]);
      const layer = cur.layers?.[layerIdx];
      if (!layer || !Array.isArray(layer.children)) return false;
      const next = {
        ...cur,
        layers: cur.layers.map((l, i) => {
          if (i !== layerIdx) return l;
          return { ...l, children: l.children.filter((_, j) => j !== childIdx) };
        }),
      };
      get().setTemplate(next);
      return true;
    }
    const topMatch = /^n-(\d+)$/.exec(id);
    if (topMatch) {
      const layerIdx = Number(topMatch[1]);
      if (!cur.layers || layerIdx >= cur.layers.length) return false;
      const next = {
        ...cur,
        layers: cur.layers.filter((_, i) => i !== layerIdx),
      };
      get().setTemplate(next);
      return true;
    }
    return false;
  },
}));
