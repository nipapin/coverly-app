import { useEffect, useRef, useState } from "react";
import { useDropletsStore } from "../stores/DropletStore";
import { useImagesStore } from "../stores/ImagesStore";
import { useStageStore } from "../stores/StageStore";
import { useTemplateStore } from "../stores/TemplateStore";

export default function Droplet({ droplet }) {
	const [isVisible, setIsVisible] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);
	const { images, setImages } = useImagesStore();
	const { template, setTemplate } = useTemplateStore();
	const { stage } = useStageStore();
	const { resetDroplets } = useDropletsStore();
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

		// Resolve the parent layer name. Preferred path: walk up the Konva
		// tree from the placeholder Group. Fallback: derive from the droplet's
		// own name (format `${parent}-placeholder` is set in `NoImageView`).
		// We need the fallback because `useDroplets` caches the rect+name from
		// mount time, so the record outlives the placeholder when:
		//   - the user already loaded an image into that slot earlier;
		//   - the scene renderer is on, where `NoImageView` is never mounted.
		// Without it, a second drop on the same area crashes the app.
		const dropletLayer = stage?.findOne((node) => node.name?.() === droplet.name);
		let name = dropletLayer?.getParent?.()?.name?.();
		if (!name && typeof droplet.name === "string") {
			name = droplet.name.replace(/-placeholder$/, "");
		}
		if (!name) {
			console.warn("[Droplet] could not resolve parent layer name for", droplet.name);
			return;
		}

		const modifiedTemplate = {
			...template,
			layers: template.layers.map((layer) => {
				if (layer.name === name) {
					return {
						...layer,
						children: layer.children.map((child) => {
							if (child.name === name) {
								return {
									...child,
									src: data.url,
									variants: [...child.variants, { src: data.url }]
								};
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

	// `resetDroplets` is a tick from the store that signals "the user picked a
	// different image slot, throw away the local upload state". The effect is
	// the right shape for "react to an external signal" — there's no derived
	// data we could compute in render to replace it.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsLoaded(false);
		inputRef.current.value = null;
	}, [resetDroplets]);

	const style = {
		display: isLoaded ? "none" : "block",
		opacity: isVisible ? 1 : 0,
		left: `${droplet.rect.x}px`,
		top: `${droplet.rect.y}px`,
		width: `${droplet.rect.width}px`,
		height: `${droplet.rect.height}px`
	};

	return (
		<div
			className='droplet'
			style={style}
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
