import { useStageStore } from "@/app/stores/StageStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";

export function useTemplateExport() {
  const { stage } = useStageStore();
  const { template } = useTemplateStore();

  const exportTemplateView = async (filename = "template-export.jpg") => {
    if (!stage || !template) {
      console.error("Stage or template not available");
      return;
    }

    try {
      // Получаем слой TemplateView
      const templateLayer = stage.findOne((node) => node.name() === "TemplateView");

      if (!templateLayer) {
        console.error("TemplateView layer not found");
        return;
      }

      // Создаем временный stage для экспорта в оригинальном размере
      const exportStage = stage.clone();
      exportStage.size({ width: 1280, height: 720 });
      const exportTemplateLayer = exportStage.findOne((node) => node.name() === "TemplateView");

      if (!exportTemplateLayer) {
        console.error("TemplateView layer not found in cloned stage");
        return;
      }

      // Устанавливаем оригинальные размеры 1920x1080
      const originalWidth = 1920;
      const originalHeight = 1080;

      // Сбрасываем трансформации для оригинального размера
      exportTemplateLayer.scaleX(1);
      exportTemplateLayer.scaleY(1);
      exportTemplateLayer.x(0);
      exportTemplateLayer.y(0);
      exportTemplateLayer.offsetX(0);
      exportTemplateLayer.offsetY(0);

      // Устанавливаем размеры stage для экспорта
      exportStage.width(originalWidth);
      exportStage.height(originalHeight);
      exportStage.scaleX(1);
      exportStage.scaleY(1);
      exportStage.x(0);
      exportStage.y(0);

      // Рендерим stage в canvas с изменением размера до 1280x720

      const dataURL = exportStage.toDataURL({
        mimeType: "image/jpeg",
        quality: 0.8,
        pixelRatio: 1,
        width: originalWidth,
        height: originalHeight,
      });

      const outputImage = new Image();
      outputImage.src = dataURL;
      outputImage.width = 1280;
      outputImage.height = 720;

      document.body.appendChild(outputImage);

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = 1280;
      outputCanvas.height = 720;
      const outputContext = outputCanvas.getContext("2d");
      outputContext.drawImage(outputImage, 0, 0, 1280, 720);
      const outputDataURL = outputCanvas.toDataURL("image/jpeg", 0.8);

      document.body.appendChild(outputCanvas);

      // Создаем ссылку для скачивания
      const link = document.createElement("a");
      link.download = filename;
      link.href = outputDataURL;

      // Добавляем ссылку в DOM, кликаем и удаляем
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(outputCanvas);
      document.body.removeChild(outputImage);
      document.body.removeChild(link);

      return outputDataURL;
    } catch (error) {
      console.error("Error exporting template:", error);
      throw error;
    }
  };

  const exportTemplateViewAsBlob = async (filename = "template-export.png") => {
    if (!stage || !template) {
      console.error("Stage or template not available");
      return;
    }

    try {
      // Получаем слой TemplateView
      const templateLayer = stage.findOne((node) => node.name() === "TemplateView");

      if (!templateLayer) {
        console.error("TemplateView layer not found");
        return;
      }

      // Создаем временный stage для экспорта в оригинальном размере
      const exportStage = stage.clone();
      const exportTemplateLayer = exportStage.findOne((node) => node.name() === "TemplateView");

      if (!exportTemplateLayer) {
        console.error("TemplateView layer not found in cloned stage");
        return;
      }

      // Устанавливаем оригинальные размеры 1920x1080
      const originalWidth = 1920;
      const originalHeight = 1080;

      // Сбрасываем трансформации для оригинального размера
      exportTemplateLayer.scaleX(1);
      exportTemplateLayer.scaleY(1);
      exportTemplateLayer.x(0);
      exportTemplateLayer.y(0);
      exportTemplateLayer.offsetX(0);
      exportTemplateLayer.offsetY(0);

      // Устанавливаем размеры stage для экспорта
      exportStage.width(originalWidth);
      exportStage.height(originalHeight);
      exportStage.scaleX(1);
      exportStage.scaleY(1);
      exportStage.x(0);
      exportStage.y(0);

      // Рендерим stage в canvas и получаем blob
      const canvas = exportStage.toCanvas({
        width: originalWidth,
        height: originalHeight,
        pixelRatio: 1,
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob"));
            }
          },
          "image/png",
          1
        );
      });
    } catch (error) {
      console.error("Error exporting template as blob:", error);
      throw error;
    }
  };

  const exportTemplateThumbnail = async () => {
    if (!stage || !template) {
      console.log("Stage or template not available", stage, template);
      console.error("Stage or template not available");
      return;
    }

    try {
      // Получаем слой TemplateView
      const templateLayer = stage.findOne((node) => node.name() === "TemplateView");

      if (!templateLayer) {
        console.error("TemplateView layer not found");
        return;
      }

      // Создаем временный stage для экспорта в оригинальном размере
      const exportStage = stage.clone();
      const exportTemplateLayer = exportStage.findOne((node) => node.name() === "TemplateView");

      if (!exportTemplateLayer) {
        console.error("TemplateView layer not found in cloned stage");
        return;
      }

      // Устанавливаем оригинальные размеры 1920x1080
      const originalWidth = 1920;
      const originalHeight = 1080;

      // Сбрасываем трансформации для оригинального размера
      exportTemplateLayer.scaleX(1);
      exportTemplateLayer.scaleY(1);
      exportTemplateLayer.x(0);
      exportTemplateLayer.y(0);
      exportTemplateLayer.offsetX(0);
      exportTemplateLayer.offsetY(0);

      // Устанавливаем размеры stage для экспорта
      exportStage.width(originalWidth);
      exportStage.height(originalHeight);
      exportStage.scaleX(1);
      exportStage.scaleY(1);
      exportStage.x(0);
      exportStage.y(0);

      // Рендерим stage в canvas
      const dataURL = exportStage.toDataURL({
        mimeType: "image/jpeg",
        quality: 0.8,
        pixelRatio: 1,
        width: originalWidth,
        height: originalHeight,
      });

      return dataURL;
    } catch (error) {
      console.error("Error exporting template:", error);
      throw error;
    }
  };

  return {
    exportTemplateView,
    exportTemplateViewAsBlob,
    exportTemplateThumbnail,
  };
}
