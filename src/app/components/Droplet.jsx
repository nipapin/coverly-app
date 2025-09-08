import { useRef, useState } from "react";
import { useImagesStore } from "../stores/ImagesStore";
import { useTemplateStore } from "../stores/TemplateStore";

export default function Droplet({ droplet, stageRef }) {
	const [isVisible, setIsVisible] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);
	const { images, setImages } = useImagesStore();
	const { template, setTemplate } = useTemplateStore();
	const inputRef = useRef(null);

	const handleDragEnter = (e) => {
		e.preventDefault();
		setIsVisible(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		setIsVisible(false);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const loadFile = async (file) => {
		const formData = new FormData();
		formData.append("file", file);

		const res = await fetch("/api/upload", {
			method: "POST",
			body: formData
		});

		const data = await res.json();
		const stage = stageRef.current.getStage();
		const dropletLayer = stage.findOne((node) => node.name() === droplet.name);
		const parent = dropletLayer.getParent();
		const name = parent.name();
		const modifiedTemplate = {
			...template,
			layers: template.layers.map((layer) => {
				if (layer.name === name) {
					return {
						...layer,
						children: layer.children.map((child) => {
							if (child.name === name) {
								return { ...child, src: data.url, variants: [...child.variants, { src: data.url }] };
							}
							return child;
						})
					};
				}
				return layer;
			})
		};
		setTemplate(modifiedTemplate);
		setImages({ ...images, [name]: { src: data.url } });

		setIsLoaded(true);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsVisible(false);
		const file = e.dataTransfer.files[0];
		loadFile(file);
	};

	const handleChange = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsVisible(false);
		const file = e.target.files[0];
		loadFile(file);
	};

	return (
		<div
			className='droplet'
			style={{
				display: isLoaded ? "none" : "block",
				opacity: isVisible ? 1 : 0,
				left: droplet.rect.x,
				top: droplet.rect.y,
				width: droplet.rect.width,
				height: droplet.rect.height
			}}
			onMouseEnter={handleDragEnter}
			onMouseLeave={handleDragLeave}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onClick={() => inputRef.current.click()}
		>
			<input ref={inputRef} type='file' onChange={handleChange} style={{ display: "none" }} />
		</div>
	);
}
