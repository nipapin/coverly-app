import ImageSource from "./ImageSource";
import NoImageView from "./NoImageView";

export default function ImageView({ item, path }) {
  return item.variants.length > 0 ? (
    <>
      {item.variants.map((variant) => (
        <ImageSource
          key={variant.id || variant.src}
          variant={variant}
          visible={variant.src === item.src}
          layerName={item.name}
          path={path}
        />
      ))}
    </>
  ) : (
    <NoImageView item={item} />
  );
}
