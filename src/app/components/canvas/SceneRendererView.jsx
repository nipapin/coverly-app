import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useFontStore } from "@/app/stores/FontStore";
import { useLayersUiStore } from "@/app/stores/LayersUiStore";
import { useSelectionStore } from "@/app/stores/SelectionStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useTextStore } from "@/app/stores/TextStore";
import { NODE_KINDS } from "@/lib/scene";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";
import useImage from "use-image";

/**
 * Pilot scene renderer (Phase 2). Reads `scene` directly from `TemplateStore`
 * and walks it recursively, mapping each node kind to its Konva primitive.
 *
 * Crucial differences vs the legacy `LayerView` family:
 *  - No `useEffect` + `setAttrs` — geometry is pure props, derived from
 *    `node.transform` and (for images) the parent slot.
 *  - No `setTimeout` shenanigans for fonts — text re-renders when the font
 *    store changes, full stop.
 *  - One renderer for every kind, recursive over `children`.
 *
 * It is opt-in for Phase 2 (TemplateView gates it on a flag) so we can compare
 * its output to the legacy renderer side-by-side without breaking shipping
 * templates. Phase 5 makes it the only renderer once the per-kind writers
 * exist.
 */
export default function SceneRendererView() {
  const scene = useTemplateStore((s) => s.scene);
  if (!scene || !Array.isArray(scene.nodes)) return null;
  return (
    <>
      {scene.nodes.map((node) => (
        <NodeRenderer key={node.id} node={node} parentWidth={scene.size.width} parentHeight={scene.size.height} />
      ))}
    </>
  );
}

function NodeRenderer({ node, parentWidth, parentHeight }) {
  const hidden = useLayersUiStore((s) => !!s.hidden[node.id]);
  if (hidden || node.visible === false) return null;
  switch (node.kind) {
    case NODE_KINDS.frame:
      return <FrameNode node={node} />;
    case NODE_KINDS.image:
      return <ImageNode node={node} parentWidth={parentWidth} parentHeight={parentHeight} />;
    case NODE_KINDS.shape:
      return <ShapeNode node={node} />;
    case NODE_KINDS.text:
      return <TextNode node={node} />;
    case NODE_KINDS.asset:
      return <AssetNode node={node} />;
    default:
      return null;
  }
}

function selectionHandlers(id, selectByEvent) {
  return {
    onClick: (e) => selectByEvent(id, e),
    onTap: (e) => selectByEvent(id, e),
  };
}

function FrameNode({ node }) {
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const t = node.transform;
  const clip = node.clipChildren
    ? { x: 0, y: 0, width: t.width, height: t.height }
    : undefined;
  return (
    <Group
      id={node.id}
      name={node.legacyName ?? node.name}
      x={t.x}
      y={t.y}
      width={t.width}
      height={t.height}
      clip={clip}
      {...selectionHandlers(node.id, selectByEvent)}
    >
      {Array.isArray(node.children) &&
        node.children.map((child) => (
          <NodeRenderer
            key={child.id}
            node={child}
            parentWidth={t.width}
            parentHeight={t.height}
          />
        ))}
    </Group>
  );
}

function ImageNode({ node, parentWidth, parentHeight }) {
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const variants = node.props?.variants ?? [];
  const active = variants.find((v) => v.id === node.props?.activeVariantId) ?? variants[0];
  const [img] = useImage(active?.src ?? "", "anonymous");
  if (!active || !img) return null;

  // The stored transform from `useTransform.handleTransformEnd` wins because
  // it captures any user repositioning. Otherwise we cover-fit the natural
  // image size into the parent slot, matching legacy behavior.
  const stored = active.transform;
  const attrs = stored
    ? {
        x: stored.x,
        y: stored.y,
        width: stored.width,
        height: stored.height,
        scaleX: stored.scaleX,
        scaleY: stored.scaleY,
        rotation: stored.rotation ?? 0,
      }
    : coverFit(img.width, img.height, parentWidth, parentHeight);

  return (
    <KonvaImage
      id={node.id}
      name={node.legacyName ?? node.name}
      nodeKind={NODE_KINDS.image}
      image={img}
      {...attrs}
      draggable
      {...selectionHandlers(node.id, selectByEvent)}
    />
  );
}

function ShapeNode({ node }) {
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const t = node.transform;
  return (
    <Rect
      id={node.id}
      name={node.legacyName ?? node.name}
      nodeKind={NODE_KINDS.shape}
      x={t.x}
      y={t.y}
      width={t.width}
      height={t.height}
      scaleX={t.scaleX ?? 1}
      scaleY={t.scaleY ?? 1}
      rotation={t.rotation ?? 0}
      fill={node.props?.fill ?? "#ffffff"}
      {...selectionHandlers(node.id, selectByEvent)}
    />
  );
}

function TextNode({ node }) {
  const { font, fontSize } = useFontStore();
  const { texts } = useTextStore();
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const t = node.transform;
  const legacyKey = node.legacyName ?? node.name;
  const overrideText = texts?.[legacyKey]?.text;
  const baseText = overrideText ?? node.props?.text ?? "Sample Text";
  const finalText = node.props?.uppercase === false ? baseText : baseText.toUpperCase();

  return (
    <Group id={node.id} name={legacyKey} x={t.x} y={t.y}>
      <Rect
        nodeKind={NODE_KINDS.text}
        x={0}
        y={0}
        width={t.width}
        height={t.height}
        fill={node.props?.background ?? "#ffee02"}
        {...selectionHandlers(node.id, selectByEvent)}
      />
      <Text
        listening={false}
        x={0}
        y={9}
        width={t.width}
        height={t.height}
        text={finalText}
        align={node.props?.align ?? "center"}
        verticalAlign={node.props?.verticalAlign ?? "middle"}
        fontFamily={font}
        fontSize={fontSize}
        fill={node.props?.fill ?? "#000000"}
        padding={0}
      />
    </Group>
  );
}

function AssetNode({ node }) {
  const assets = useAssetsStore((s) => s.assets);
  const selectedAsset = useAssetsStore((s) => s.selectedAsset);
  const position = useAssetsStore((s) => s.position);
  const flipX = useAssetsStore((s) => s.flipX);
  const flipY = useAssetsStore((s) => s.flipY);
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);

  const legacyKey = node.legacyName ?? node.name;
  const currentAsset = assets?.find?.((a) => a.name === legacyKey) ?? null;
  const src = currentAsset?.src?.[selectedAsset];
  const [img] = useImage(src ?? "", "anonymous");
  if (!img || !currentAsset) return null;

  const { startPoint, endPoint } = currentAsset;
  const startX =
    startPoint.x.value - img.width * startPoint.offsetX.value + startPoint.padding.x.value;
  const startY =
    startPoint.y.value - img.height * startPoint.offsetY.value + startPoint.padding.y.value;
  const endX = endPoint.x.value - img.width * endPoint.offsetX.value + endPoint.padding.x.value;
  const endY = endPoint.y.value - img.height * endPoint.offsetY.value + endPoint.padding.y.value;
  const x = startX + (endX - startX) * (1 - position);
  const y = startY + (endY - startY) * (1 - position);

  return (
    <KonvaImage
      id={node.id}
      name={legacyKey}
      nodeKind={NODE_KINDS.asset}
      image={img}
      x={x}
      y={y}
      width={img.width}
      height={img.height}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
      offsetX={flipX ? img.width : 0}
      offsetY={flipY ? img.height : 0}
      {...selectionHandlers(node.id, selectByEvent)}
    />
  );
}

function coverFit(imgW, imgH, slotW, slotH) {
  if (!imgW || !imgH) return { x: 0, y: 0, width: slotW, height: slotH, scaleX: 1, scaleY: 1, rotation: 0 };
  const width = slotW;
  const height = imgH * (slotW / imgW);
  const y = (slotH - height) / 2;
  return { x: 0, y, width, height, scaleX: 1, scaleY: 1, rotation: 0 };
}
