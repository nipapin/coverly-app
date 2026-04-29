import { useDropletsStore } from "@/app/stores/DropletStore";
import { useSelectionStore } from "@/app/stores/SelectionStore";
import { useTemplateStore } from "@/app/stores/TemplateStore";
import { Delete, ExpandLess, ExpandMore, Upload } from "@mui/icons-material";
import { Avatar, Box, CardHeader, IconButton } from "@mui/material";
import { useRef } from "react";

const LayerNames = {
	"left-image": "Left Image",
	"right-image": "Right Image"
};

export default function ImageCardHeader({ src, name, count, onToggleExpand, expanded }) {
	const { template, setTemplate } = useTemplateStore();
	const clearSelection = useSelectionStore((s) => s.clear);
	const { setResetDroplets } = useDropletsStore();
	const inputRef = useRef(null);

	const sourceLayer = template.layers.find((templateLayer) =>
		templateLayer.children?.some((child) => child.name === name && child.type === "image"),
	);

	const handleDelete = () => {
		if (!sourceLayer) return;
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((layer) => {
				if (layer !== sourceLayer) return layer;
				return {
					...layer,
					children: layer.children.map((child) =>
						child.type === "image" && child.name === name ? { ...child, src: "", variants: [] } : child,
					),
				};
			}),
		};
		clearSelection();
		setResetDroplets();
		setTemplate(modifiedTemplate);
	};
	const handleUpload = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		if (!sourceLayer) return;
		const formData = new FormData();
		formData.append("file", file);
		const res = await fetch("/api/upload", {
			method: "POST",
			body: formData
		});
		const data = await res.json();
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((layer) => {
				if (layer !== sourceLayer) return layer;
				return {
					...layer,
					children: layer.children.map((child) =>
						child.type === "image" && child.name === name
							? {
									...child,
									src: data.url,
									variants: [{ src: data.url }],
							  }
							: child,
					),
				};
			}),
		};
		setTemplate(modifiedTemplate);
		e.target.value = "";
	};
	return (
		<>
			<CardHeader
				avatar={<Avatar src={src} variant='rounded' />}
				title={LayerNames[name] || name}
				subheader={`${count} variants`}
				action={
					<Box display={"flex"}>
						<IconButton onClick={() => inputRef.current.click()}>
							<Upload />
						</IconButton>
						<IconButton onClick={handleDelete}>
							<Delete />
						</IconButton>
						<IconButton onClick={onToggleExpand}>{expanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
					</Box>
				}
			/>
			<input ref={inputRef} type='file' accept='image/*' onChange={handleUpload} style={{ display: "none" }} />
		</>
	);
}
