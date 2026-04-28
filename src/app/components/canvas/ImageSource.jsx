import { useTransform } from "@/app/hooks/useTransform";
import { useIsSelected, useSelectionStore } from "@/app/stores/SelectionStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useEffect, useRef } from "react";
import { Image } from "react-konva";
import useImage from "use-image";

/**
 * One Konva.Image per image variant. Only the active variant is visible and
 * listens to events; that single visible node carries the scene `id` (which
 * matches the SelectionStore id), so the global Transformer can find it via
 * `stage.findOne('#id')` without us having to maintain refs here.
 *
 * Selection is fully declarative now: clicking dispatches to the store, and
 * `draggable` follows from `useIsSelected`. There is no manual transformer
 * manipulation or `setDraggable` — the previous imperative code caused the
 * "self-moving" bug where switching variants left the transformer attached to
 * a hidden node.
 */
export default function ImageSource({ variant, visible, layerName, path }) {
  const { template } = useTemplateStore();
  const { handleTransformEnd } = useTransform();
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const isSelected = useIsSelected(path);
  const [imageSource] = useImage(variant.src || "", "anonymous");
  const imageRef = useRef(null);

  useEffect(() => {
    const templateLayer = template.layers
      .find((_layer) => _layer.name === layerName)
      .children[0].variants.find((_variant) => _variant.src === variant.src);

    if (imageRef.current && imageSource) {
      const img = imageRef.current;
      const parent = img.getParent();
      if (!parent) return;
      if (templateLayer.transform) {
        img.setAttrs({
          width: templateLayer.transform.width,
          height: templateLayer.transform.height,
          scaleX: templateLayer.transform.scaleX,
          scaleY: templateLayer.transform.scaleY,
          x: templateLayer.transform.x,
          y: templateLayer.transform.y,
          offsetX: 0,
          offsetY: 0,
        });
        img.getStage().batchDraw();
        return;
      }

      const parentWidth = parent.width ? parent.width() : parent.getAttrs().width;
      const parentHeight = parent.height ? parent.height() : parent.getAttrs().height;
      const imgWidth = imageSource.width;
      const imgHeight = imageSource.height;
      const width = parentWidth;
      const height = imgHeight * (parentWidth / imgWidth);
      const x = 0;
      const y = (parentHeight - height) / 2;
      img.setAttrs({ x, y, width, height });
      img.getStage().batchDraw();
    }
    // We intentionally re-run only when the variant becomes visible or its
    // bitmap loads. Including `layerName`, `template.layers` or `variant.src`
    // would re-fire this effect on every unrelated template mutation and
    // overwrite the cached transform; the lookups inside the effect already
    // pick up the latest values via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageSource]);

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      ref={imageRef}
      image={imageSource}
      visible={visible}
      listening={visible}
      draggable={visible && isSelected}
      {...(visible ? { id: path } : {})}
      onClick={(e) => selectByEvent(path, e)}
      onTap={(e) => selectByEvent(path, e)}
      onDragEnd={handleTransformEnd}
    />
  );
}
