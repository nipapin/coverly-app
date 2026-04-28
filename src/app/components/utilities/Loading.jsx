"use client";
import { useAssetsStore } from "@/app/stores/AssetsStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useEffect } from "react";

function Loading({ children, template }) {
  const { setTemplate } = useTemplateStore();
  const storeTemplate = useTemplateStore((s) => s.template);
  const { setAssets, setSelectedAsset, setPosition, setFlipX, setFlipY } = useAssetsStore();

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
    } else {
      console.warn("Invalid template structure:", template);
    }
    // We bootstrap the stores from the incoming `template` prop exactly once
    // per page load. The asset setters are stable Zustand actions, but
    // including them just adds noise; `template` is the only meaningful
    // dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // The store's `template` becomes non-null synchronously inside `setTemplate`,
  // so reading from there is what tells us "bootstrap finished" — no extra
  // local boolean needed.
  if (!storeTemplate || !template) {
    return null;
  }

  return <>{children}</>;
}

export default Loading;
