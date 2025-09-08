import { useModelStore } from "../stores/ModelStore";

export function useGenerationModel() {
  const { model } = useModelStore();

  const sendRequest = async (src, prompt) => {
    const res = await fetch(`/api/generate/${model}`, {
      method: "POST",
      body: JSON.stringify({
        src: src,
        prompt: prompt,
      }),
    });
    return await res.json();
  };

  return { sendRequest };
}
