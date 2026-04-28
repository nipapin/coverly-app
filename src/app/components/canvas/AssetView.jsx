import { useTransform } from "@/app/hooks/useTransform";
import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useIsSelected, useSelectionStore } from "@/app/stores/SelectionStore";
import { useMemo } from "react";
import { Image } from "react-konva";
import useImage from "use-image";

const interpolate = (start, end, pos) => {
  return start + (end - start) * (1 - pos);
};

export default function AssetView({ item, path }) {
  const assets = useAssetsStore((state) => state.assets);
  const selectedAsset = useAssetsStore((state) => state.selectedAsset);
  const position = useAssetsStore((state) => state.position);
  const flipX = useAssetsStore((state) => state.flipX);
  const flipY = useAssetsStore((state) => state.flipY);
  const selectByEvent = useSelectionStore((s) => s.selectByEvent);
  const isSelected = useIsSelected(path);
  const { handleTransformEnd } = useTransform();

  const currentAsset = useMemo(() => {
    if (!assets || assets.length === 0) return null;
    return assets.find((asset) => asset.name === item.name) || null;
  }, [assets, item.name]);

  const imageSrc = currentAsset?.src?.[selectedAsset];
  const [image] = useImage(imageSrc || null, "anonymous");

  // The asset's on-stage rectangle is a pure derivation of (image, position,
  // currentAsset). Memoize directly in render — no `useEffect` + `useState`
  // round-trip — so the lint stays clean and we avoid a wasted commit.
  const attrs = useMemo(() => {
    if (!image || !currentAsset) return { x: 0, y: 0, width: 0, height: 0 };
    const { startPoint, endPoint } = currentAsset;

    const startX = startPoint.x.value - image.width * startPoint.offsetX.value + startPoint.padding.x.value;
    const startY = startPoint.y.value - image.height * startPoint.offsetY.value + startPoint.padding.y.value;
    const endX = endPoint.x.value - image.width * endPoint.offsetX.value + endPoint.padding.x.value;
    const endY = endPoint.y.value - image.height * endPoint.offsetY.value + endPoint.padding.y.value;

    return {
      x: interpolate(startX, endX, position),
      y: interpolate(startY, endY, position),
      width: image.width,
      height: image.height,
    };
  }, [image, position, currentAsset]);

  if (!image || !currentAsset) return null;

  // Asset position is interpolated from AssetsStore.position, so on dragstart
  // we record the visible top-left as the baseline; useTransform's asset
  // writer then computes (final - initial) and shifts both startPoint and
  // endPoint by that delta.
  return (
    // `Image` here is the Konva canvas primitive, not an HTML `<img>`, so
    // `alt` is not a real prop. jsx-a11y can't distinguish between the two.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      id={path}
      nodeKind="asset"
      image={image}
      {...attrs}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
      offsetX={flipX ? image.width : 0}
      offsetY={flipY ? image.height : 0}
      draggable={isSelected}
      onClick={(e) => selectByEvent(path, e)}
      onTap={(e) => selectByEvent(path, e)}
      onDragStart={(e) => {
        e.target.attrs._initialX = e.target.x();
        e.target.attrs._initialY = e.target.y();
      }}
      onDragEnd={handleTransformEnd}
    />
  );
}
