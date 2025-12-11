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
    layerSource.setAttrs({ x: layerGroup.width() / 2, offsetX: layerSource.width() / 2 });
    handleTransformEnd({ target: layerSource });
  };

  const alignVerticalCenter = () => {
    resetTransform();
    const layerGroup = stage.findOne((node) => node.name() === layer.name);
    const layerSource = layerGroup.children.find((child) => child.visible());
    if (!layerSource) return;
    layerSource.setAttrs({ y: layerGroup.height() / 2, offsetY: layerSource.height() / 2 });
    handleTransformEnd({ target: layerSource });
  };
  const fitVertical = () => {
    resetTransform();
    const layerGroup = stage.findOne((node) => node.name() === layer.name);
    const layerSource = layerGroup.children.find((child) => child.visible());
    if (!layerSource) return;
    const ratio = layerGroup.getAttrs().height / layerSource.height();
    layerSource.setAttrs({
      scaleX: ratio,
      scaleY: ratio,
      x: layerGroup.width() / 2,
      y: 0,
      offsetX: layerSource.width() / 2,
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
    layerSource.setAttrs({
      scaleX: ratio,
      scaleY: ratio,
      x: 0,
      y: layerGroup.height() / 2,
      offsetY: layerSource.height() / 2,
      offsetX: 0,
    });
    handleTransformEnd({ target: layerSource, manual: true });
  };
  return {
    resetTransform,
    alignHorizontalCenter,
    alignVerticalCenter,
    fitVertical,
    fitHorizontal,
  };
};
