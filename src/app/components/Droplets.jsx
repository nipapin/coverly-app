import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useDroplets } from "../hooks/useDroplets";
import { useDropletsStore } from "../stores/DropletStore";
import Droplet from "./Droplet";

export default function Droplets() {
	const { droplets } = useDropletsStore();
	const { handleDragOver, handleDrop } = useDragAndDrop();

	const getDropletKey = (droplet, index) => {
		const { x, y, width, height } = droplet.rect || {};
		return `${droplet.name || index}-${x}-${y}-${width}-${height}`;
	};
	return (
		<>
			{droplets.map((droplet, index) => {
				return <Droplet key={getDropletKey(droplet, index)} droplet={droplet} onDragOver={handleDragOver} onDrop={handleDrop} />;
			})}
		</>
	);
}
