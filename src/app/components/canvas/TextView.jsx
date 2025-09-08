import { Text } from "react-konva";

export default function TextView({ item }) {
	return <Text width={item.width} height={item.height} text={item.text} />;
}
