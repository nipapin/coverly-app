import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useDroplets } from "../hooks/useDroplets";
import Droplet from "./Droplet";

export default function Droplets() {
	const { droplets } = useDroplets();
	const { handleDragOver, handleDrop } = useDragAndDrop();

	return (
		<>
			{droplets.map((droplet, index) => {
				return <Droplet key={index} droplet={droplet} onDragOver={handleDragOver} onDrop={handleDrop} />;
			})}
		</>
	);
}
