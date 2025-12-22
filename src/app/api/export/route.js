import sharp from "sharp";

const PREFIX = "data:image/jpeg;base64,";

export async function POST(request) {
  const { image } = await request.json();
  const imageBuffer = Buffer.from(image.replace(PREFIX, ""), "base64");
  const resizedImageBuffer = await sharp(imageBuffer).resize(1280, 720).toBuffer();
  return new Response(JSON.stringify({ image: PREFIX + resizedImageBuffer.toString("base64") }), { status: 200 });
}
