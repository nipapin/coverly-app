import { useTemplateStore } from "../stores/TemplateStore";

const saveTransform = (node) => {
  return {
    x: node.x(),
    y: node.y(),
    width: node.width(),
    height: node.height(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
    rotation: node.rotation(),
  };
};

const CHILD_ID_RE = /^n-(\d+)-c-(\d+)$/;
const TOP_ID_RE = /^n-(\d+)$/;

/**
 * Writers per node kind. Phase 5 lets every selectable kind round-trip a
 * transform back into the legacy template:
 *   - image children: position + size in the active variant (existing).
 *   - top-level shapes: x / y / width / height in pixels — converted in Phase 8
 *     to go through the canonical scene-first `applyScenePatch` path.
 *   - top-level groups (frames): x / y in pixels — children are positioned
 *     relative to the group, so they follow without further math.
 *   - top-level assets: shift `startPoint` and `endPoint` by the same delta.
 *     Asset position along the segment is owned by `AssetsStore.position`,
 *     so we only translate the segment itself.
 *   - text children: drag is translated into a parent-group move. Text has
 *     no own x/y in the legacy model — its visible position is the group's,
 *     so we just shift the group by the same delta the text Rect moved by.
 *
 * Two writer shapes coexist for now:
 *   - **legacy** writers mutate `template.layers[*]` directly and let the
 *     store re-derive the scene. Used by group / asset / text-child / image-
 *     child until they're ported.
 *   - **scene-first** writers call `applyScenePatch(nodeId, transformPatch)`
 *     on the store. The store updates the canonical scene, runs reverse
 *     migration, and persists the resulting template. New nodes added through
 *     the scene editor will eventually only know about this path.
 */
export const useTransform = () => {
  const { template, setTemplate } = useTemplateStore();
  const applyScenePatch = useTemplateStore((s) => s.applyScenePatch);

  const handleTransformEnd = (e) => {
    const target = e.target;
    if (!target) return;
    const id = typeof target.id === "function" ? target.id() : null;
    if (!id) return;

    const childMatch = CHILD_ID_RE.exec(id);
    if (childMatch) {
      const layerIdx = Number(childMatch[1]);
      const childIdx = Number(childMatch[2]);
      const layer = template.layers?.[layerIdx];
      const child = layer?.children?.[childIdx];
      if (!child) return;
      if (child.type === "image") {
        applyImageChildTransform(template, setTemplate, layerIdx, childIdx, target, e.manual);
      } else if (child.type === "text") {
        applyTextChildDrag(template, setTemplate, layerIdx, target);
      }
      return;
    }

    const topMatch = TOP_ID_RE.exec(id);
    if (topMatch) {
      const layerIdx = Number(topMatch[1]);
      const layer = template.layers?.[layerIdx];
      if (!layer) return;
      if (layer.type === "shape") {
        applyShapeTransformScene(applyScenePatch, id, target);
      } else if (layer.type === "group") {
        applyGroupTransformScene(applyScenePatch, id, target);
      } else if (layer.type === "asset") {
        applyAssetTransform(template, setTemplate, layerIdx, target);
      }
    }
  };

  return { handleTransformEnd };
};

/**
 * Scene-first writer for top-level shape transforms. Bakes the Konva
 * transformer's scale into width/height (so successive transforms don't
 * compound) and forwards the full transform delta to the store via
 * `applyScenePatch`. The store handles scene→template sync and persistence.
 */
function applyShapeTransformScene(applyScenePatch, nodeId, target) {
  const width = target.width() * target.scaleX();
  const height = target.height() * target.scaleY();
  target.scaleX(1);
  target.scaleY(1);
  target.width(width);
  target.height(height);

  applyScenePatch(nodeId, {
    x: target.x(),
    y: target.y(),
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    rotation: target.rotation(),
  });
}

function applyImageChildTransform(template, setTemplate, layerIdx, childIdx, target, manual) {
  const layerGroup = target.getParent();
  const absolutePosition = layerGroup
    ? target.getAbsolutePosition(layerGroup)
    : { x: target.x(), y: target.y() };
  const transform = saveTransform(target);

  const modifiedTemplate = {
    ...template,
    layers: template.layers.map((layer, lIdx) => {
      if (lIdx !== layerIdx) return layer;
      return {
        ...layer,
        children: layer.children.map((child, cIdx) => {
          if (cIdx !== childIdx) return child;
          return {
            ...child,
            variants: child.variants.map((variant) =>
              variant.src === child.src
                ? {
                    ...variant,
                    transform: { ...transform, manual },
                    clientRect: { ...absolutePosition },
                  }
                : variant
            ),
          };
        }),
      };
    }),
  };
  setTemplate(modifiedTemplate);
}

/**
 * Drag of a text child translates into a move of its parent group. The text
 * Rect itself fills the group (see `TextView`), so the absolute position the
 * user sees is the group's anchor + a constant offset. Shifting the group by
 * the same delta the user dragged keeps the text under the cursor.
 *
 * `_initialX` / `_initialY` are stamped by `TextView.onDragStart` so we have a
 * baseline even though Konva resets the local coords back to (0,0) once the
 * group is the one moving.
 */
function applyTextChildDrag(template, setTemplate, layerIdx, target) {
  const layer = template.layers[layerIdx];
  if (!layer) return;
  const initialX = target.attrs._initialX;
  const initialY = target.attrs._initialY;
  if (typeof initialX !== "number" || typeof initialY !== "number") return;
  const shiftX = target.x() - initialX;
  const shiftY = target.y() - initialY;
  if (shiftX === 0 && shiftY === 0) return;

  const baseX = readPixels(layer.x);
  const baseY = readPixels(layer.y);

  // Snap the dragged Rect back to its anchor inside the group; the visual
  // position will be re-established on the next render via the group move.
  target.x(initialX);
  target.y(initialY);

  const modifiedTemplate = {
    ...template,
    layers: template.layers.map((layerCur, idx) => {
      if (idx !== layerIdx) return layerCur;
      return {
        ...layerCur,
        x: pixelMeasure(baseX + shiftX),
        y: pixelMeasure(baseY + shiftY),
      };
    }),
  };
  setTemplate(modifiedTemplate);
}

/**
 * Best-effort read of a measure value as pixels. Percent measures need scene
 * size to convert and we don't have it here; in practice text groups in the
 * shipped templates use pixels, and the writer falls back to the raw value
 * otherwise so we don't lose data.
 */
function readPixels(measure) {
  if (!measure) return 0;
  if (typeof measure === "number") return measure;
  if (measure.unit === "pixels") return measure.value || 0;
  return measure.value || 0;
}

/**
 * Scene-first writer for top-level frame (group) translations. Resize is still
 * deferred — re-flowing percent-unit children needs scene size at write time
 * which is owned by the layout pipeline, not the writer.
 */
function applyGroupTransformScene(applyScenePatch, nodeId, target) {
  applyScenePatch(nodeId, {
    x: target.x(),
    y: target.y(),
  });
}

function applyAssetTransform(template, setTemplate, layerIdx, target) {
  const layer = template.layers[layerIdx];
  const initialX = target.attrs._initialX;
  const initialY = target.attrs._initialY;
  if (typeof initialX !== "number" || typeof initialY !== "number") {
    // Without a recorded baseline (set in AssetView.onDragStart) we can't
    // compute a delta safely. Bail rather than write a garbage offset.
    return;
  }
  const shiftX = target.x() - initialX;
  const shiftY = target.y() - initialY;

  const modifiedTemplate = {
    ...template,
    layers: template.layers.map((layerCur, idx) => {
      if (idx !== layerIdx) return layerCur;
      return {
        ...layerCur,
        startPoint: shiftEndpoint(layer.startPoint, shiftX, shiftY),
        endPoint: shiftEndpoint(layer.endPoint, shiftX, shiftY),
      };
    }),
  };
  setTemplate(modifiedTemplate);
}

function shiftEndpoint(endpoint, shiftX, shiftY) {
  if (!endpoint || !endpoint.x || !endpoint.y) return endpoint;
  return {
    ...endpoint,
    x: shiftMeasure(endpoint.x, shiftX),
    y: shiftMeasure(endpoint.y, shiftY),
  };
}

function shiftMeasure(measure, delta) {
  if (!measure) return measure;
  // We only know how to shift pixel measures; percent measures need scene
  // size at write-time, which we don't have here. The migration script keeps
  // assets as pixel measures, so this is fine for shipped templates.
  if (measure.unit !== "pixels") return measure;
  return { ...measure, value: measure.value + delta };
}

function pixelMeasure(value) {
  return { value, unit: "pixels" };
}
