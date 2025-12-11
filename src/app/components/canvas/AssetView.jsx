import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useEffect, useMemo, useState } from "react";
import { Image } from "react-konva";
import useImage from "use-image";

const interpolate = (start, end, pos) => {
  return start + (end - start) * (1 - pos);
};

export default function AssetView({ item }) {
  // Используем отдельные селекторы для избежания проблем с shallow comparison
  const assets = useAssetsStore((state) => state.assets);
  const selectedAsset = useAssetsStore((state) => state.selectedAsset);
  const position = useAssetsStore((state) => state.position);
  const flipX = useAssetsStore((state) => state.flipX);
  const flipY = useAssetsStore((state) => state.flipY);

  const currentAsset = useMemo(() => {
    if (!assets || assets.length === 0) return null;
    return assets.find((asset) => asset.name === item.name) || null;
  }, [assets, item.name]);

  const imageSrc = currentAsset?.src?.[selectedAsset];
  const [image] = useImage(imageSrc || null, "anonymous");

  const [attrs, setAttrs] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!image || !currentAsset) {
      setAttrs({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const { startPoint, endPoint } = currentAsset;

    const startX = startPoint.x.value - image.width * startPoint.offsetX.value + startPoint.padding.x.value;
    const startY = startPoint.y.value - image.height * startPoint.offsetY.value + startPoint.padding.y.value;
    const endX = endPoint.x.value - image.width * endPoint.offsetX.value + endPoint.padding.x.value;
    const endY = endPoint.y.value - image.height * endPoint.offsetY.value + endPoint.padding.y.value;

    const x = interpolate(startX, endX, position);
    const y = interpolate(startY, endY, position);

    setAttrs({ x, y, width: image.width, height: image.height });
  }, [image, position, currentAsset]);

  if (!image || !currentAsset) return null;

  return (
    <Image
      image={image}
      {...attrs}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
      offsetX={flipX ? image.width : 0}
      offsetY={flipY ? image.height : 0}
    />
  );
}
