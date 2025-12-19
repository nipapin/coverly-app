import { useStageStore } from "../stores/StageStore";
import { useTemplateStore } from "../stores/TemplateStore";
import { useTransform } from "./useTransform";

export const useImageTransform = ({ layer }) => {
  const { stage } = useStageStore();
  const { template, setTemplate } = useTemplateStore();
  const { handleTransformEnd } = useTransform();

  const resetTransform = () => {
    const modifiedTemplate = {
      ...template,
      layers: template.layers.map((_layer) => {
        if (_layer.name === layer.name) {
          return { ..._layer, children: _layer.children.map((child) => ({ ...child, transform: null })) };
        }
        return _layer;
      }),
    };
    setTemplate(modifiedTemplate);
  };

  const alignHorizontalCenter = () => {
    resetTransform();
    const layerGroup = stage.findOne((node) => node.name() === layer.name);
    const layerSource = layerGroup.children.find((child) => child.visible());
    if (!layerSource) return;
    const layerSourceAttrs = layerSource.getAttrs();
    const alignedAttrs = {
      ...layerSourceAttrs,
      x: layerGroup.width() / 2 - (layerSourceAttrs.width * layerSourceAttrs.scaleX) / 2,
    };
    layerSource.setAttrs(alignedAttrs);
    handleTransformEnd({ target: layerSource });
  };

  const alignVerticalCenter = () => {
    resetTransform();
    const layerGroup = stage.findOne((node) => node.name() === layer.name);
    const layerSource = layerGroup.children.find((child) => child.visible());
    if (!layerSource) return;
    const layerSourceAttrs = layerSource.getAttrs();
    const alignedAttrs = {
      ...layerSourceAttrs,
      y: layerGroup.height() / 2 - (layerSourceAttrs.height * layerSourceAttrs.scaleY) / 2,
    };
    layerSource.setAttrs(alignedAttrs);
    handleTransformEnd({ target: layerSource });
  };
  const fitVertical = () => {
    resetTransform();
    const layerGroup = stage.findOne((node) => node.name() === layer.name);
    const layerSource = layerGroup.children.find((child) => child.visible());
    if (!layerSource) return;
    const ratio = layerGroup.getAttrs().height / layerSource.height();
    const initX = layerSource.getAttrs().x || 0;
    const x = initX - (layerSource.width() * ratio - layerSource.width() * (layerSource.getAttrs().scaleX || 1)) / 2;
    layerSource.setAttrs({
      height: layerGroup.getAttrs().height,
      width: layerSource.width() * ratio,
      y: 0,
      x: x,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    });
    handleTransformEnd({ target: layerSource });
  };
  const fitHorizontal = () => {
    resetTransform();
    const layerGroup = stage.findOne((node) => node.name() === layer.name);
    const layerSource = layerGroup.children.find((child) => child.visible());
    if (!layerSource) return;
    const ratio = layerGroup.getAttrs().width / layerSource.width();
    const initY = layerSource.getAttrs().y || 0;
    const y = initY - (layerSource.height() * ratio - layerSource.height() * (layerSource.getAttrs().scaleY || 1)) / 2;
    layerSource.setAttrs({
      height: layerSource.height() * ratio,
      width: layerGroup.getAttrs().width,
      y: y,
      x: 0,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    });
    handleTransformEnd({ target: layerSource });
  };
  return {
    resetTransform,
    alignHorizontalCenter,
    alignVerticalCenter,
    fitVertical,
    fitHorizontal,
  };
};
