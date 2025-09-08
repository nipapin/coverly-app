import { useDropletsStore } from "@/app/stores/DropletStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { useTransformerStore } from "@/app/stores/TransformerStore";
import { Delete, Upload } from "@mui/icons-material";
import { Avatar, Box, CardHeader, IconButton } from "@mui/material";
import { useRef } from "react";

const LayerNames = {
  "left-image": "Left Image",
  "right-image": "Right Image",
};

export default function ImageCardHeader({ src, name, count }) {
  const { template, setTemplate } = useTemplateStore();
  const { transformer } = useTransformerStore();
  const { setResetDroplets } = useDropletsStore();
  const inputRef = useRef(null);

  const handleDelete = () => {
    const modifiedTemplate = {
      ...template,
      layers: template.layers.map((_layer) => {
        if (_layer.name === name) {
          const child = _layer.children.find((child) => child.src === src);
          return {
            ..._layer,
            children: _layer.children.map((child) =>
              child.type === "image" ? { ...child, src: "", variants: [] } : child
            ),
          };
        }
        return _layer;
      }),
    };
    transformer.nodes([]);
    setResetDroplets();
    setTemplate(modifiedTemplate);
  };
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    const modifiedTemplate = {
      ...template,
      layers: template.layers.map((_layer) => {
        if (_layer.name === name) {
          return {
            ..._layer,
            children: _layer.children.map((child) => ({
              ...child,
              src: data.url,
              variants: [{ src: data.url }],
            })),
          };
        }
        return _layer;
      }),
    };
    setTemplate(modifiedTemplate);
  };
  return (
    <>
      <CardHeader
        avatar={<Avatar src={src} variant="rounded" />}
        title={LayerNames[name]}
        subheader={`${count} variants`}
        action={
          <Box display={"flex"} gap={"0.5rem"}>
            <IconButton onClick={() => inputRef.current.click()}>
              <Upload />
            </IconButton>
            <IconButton onClick={handleDelete}>
              <Delete />
            </IconButton>
          </Box>
        }
      />
      <input ref={inputRef} type="file" onChange={handleUpload} style={{ display: "none" }} />
    </>
  );
}
