"use client";
import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useEffect, useState } from "react";

function Loading({ children, template }) {
  const { setTemplate } = useTemplateStore();
  const { setAssets, setSelectedAsset, setPosition, setFlipX, setFlipY } = useAssetsStore();
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);

  useEffect(() => {
    if (template && template.layers) {
      const assets = template.layers.filter((layer) => layer.type === "asset");
      if (assets.length > 0) {
        setAssets(assets);
        setSelectedAsset(template.selectedAsset ?? 0);
        setPosition(template.position ?? 1);
        setFlipX(template.flipX ?? false);
        setFlipY(template.flipY ?? false);
      }
      setTemplate(template, true);
      setIsTemplateLoaded(true);
    } else {
      console.warn("Invalid template structure:", template);
    }
  }, [template, setTemplate]);

  // Show loading state until template is properly loaded
  if (!isTemplateLoaded || !template) {
    return null;
  }

  return <>{children}</>;
}

export default Loading;
