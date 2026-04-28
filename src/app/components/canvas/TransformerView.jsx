import { useSnapping } from "@/app/hooks/useSnapping";
import { useTransform } from "@/app/hooks/useTransform";
import { useSelectionStore } from "@/app/stores/SelectionStore";
import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useTransformerStore } from "@/app/stores/TransformerStore";
import { useEffect, useRef } from "react";
import { Layer, Transformer } from "react-konva";

const FULL_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "middle-left",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

/**
 * The Transformer is a pure side-effect of `SelectionStore`. View components
 * dispatch selection actions; this component reads `selectedIds` and pushes
 * Konva nodes into the transformer accordingly.
 *
 * Anchor policy (Phase 5):
 *   - image, shape    → full resize handles + rotate (writers persist size).
 *   - group, asset, text → no anchors; move-only via drag (writers persist
 *     position only). Text drag is forwarded to its parent group's writer.
 *
 * The dependency on `template` keeps the transformer attached to the right
 * Konva node when the active image variant changes — `selectedIds` stays the
 * same but the visible node swaps.
 */
const RESIZABLE_KINDS = new Set(["shape"]); // images are detected via the absence of nodeKind
export default function TransformerView() {
  const transformerRef = useRef(null);
  const { setTransformer } = useTransformerStore();
  const { handleTransformEnd } = useTransform();
  const stage = useStageStore((s) => s.stage);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const template = useTemplateStore((s) => s.template);
  useSnapping();

  useEffect(() => {
    if (!transformerRef.current) return;
    setTransformer(transformerRef.current);
  }, [setTransformer]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer || !stage) return;

    if (selectedIds.length === 0) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    const nodes = [];
    for (const id of selectedIds) {
      const node = stage.findOne(`#${id}`);
      if (node) nodes.push(node);
    }
    transformer.nodes(nodes);

    const allResizable =
      nodes.length > 0 &&
      nodes.every((n) => {
        const kind = n.getAttr("nodeKind");
        // Image nodes don't carry an explicit kind in the legacy renderer; the
        // pilot scene renderer tags them as "image". Either way, missing-or-
        // image counts as resizable.
        if (!kind || kind === "image") return true;
        return RESIZABLE_KINDS.has(kind);
      });
    if (allResizable) {
      transformer.enabledAnchors(FULL_ANCHORS);
      transformer.rotateEnabled(true);
    } else {
      transformer.enabledAnchors([]);
      transformer.rotateEnabled(false);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, stage, template]);

  return (
    <Layer name="TransformerView">
      <Transformer ref={transformerRef} onTransformEnd={handleTransformEnd} />
    </Layer>
  );
}
