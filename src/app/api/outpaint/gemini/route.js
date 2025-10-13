import { execSync } from "child_process";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";

class ImageOutpainter {
	constructor(options = {}) {
		this.inputImagePath = options.inputImagePath || "./input/original.jpg";
		this.transform = options.transform || {};
		this.extensionWidth = options.extensionWidth || 960;
		this.extensionHeight = options.extensionHeight || 1080;
		this.textPrompt = options.textPrompt || "";
		this.imageCount = options.imageCount || 1;
		this.editMode = options.editMode || "EDIT_MODE_OUTPAINT";
		this.HTTP_METHOD_URL = `https://${process.env.LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/publishers/google/models/${process.env.MODEL_ID}:predict`;
	}

	getResultImageSize() {
		const aspectRatio = this.transform.groupTransform.width / this.transform.groupTransform.height;
		const height = 1080;
		this.resultCanvasSize = {
			width: Math.round(height * aspectRatio),
			height: height
		};
	}

	getImageRect() {
		const { groupTransform, sourceTransform } = this.transform;
		const ratio = this.resultCanvasSize.width / groupTransform.width;
		this.imageRect = {
			x: Math.round((sourceTransform.x - groupTransform.x) * ratio),
			y: Math.round((sourceTransform.y - groupTransform.y) * ratio),
			width: Math.round(sourceTransform.width * ratio),
			height: Math.round(sourceTransform.height * ratio)
		};
	}

	getAccessToken() {
		return execSync(`gcloud auth print-access-token --project=${process.env.PROJECT_ID}`).toString().trim();
	}

	async createMask() {
		const maskBuffer = await sharp({
			create: {
				width: this.resultCanvasSize.width,
				height: this.resultCanvasSize.height,
				channels: 4,
				background: { r: 255, g: 255, b: 255, alpha: 1 }
			}
		})
			.composite([
				{
					input: await sharp({
						create: {
							width: this.compositeRect.width,
							height: this.compositeRect.height,
							channels: 4,
							background: { r: 0, g: 0, b: 0, alpha: 1 }
						}
					})
						.jpeg()
						.toBuffer(),
					top: this.compositeRect.top,
					left: this.compositeRect.left
				}
			])
			.jpeg()
			.toBuffer();
		this.maskBuffer = maskBuffer;
	}

	getCroppedArea() {
		const { imageRect, resultCanvasSize } = this;
		const cropLeft = imageRect.x < 0 ? Math.abs(imageRect.x) : 0;
		const cropTop = imageRect.y < 0 ? Math.abs(imageRect.y) : 0;
		const cropWidth =
			imageRect.x + imageRect.width > resultCanvasSize.width
				? imageRect.width - (imageRect.width - resultCanvasSize.width)
				: imageRect.width - cropLeft;
		const cropHeight = imageRect.y + imageRect.height > resultCanvasSize.height ? resultCanvasSize.height - imageRect.y : imageRect.height - cropTop;
		this.croppedArea = {
			left: cropLeft,
			top: cropTop,
			width: cropWidth,
			height: cropHeight
		};
	}

	getCompositeRect() {
		const { imageRect, croppedArea } = this;
		this.compositeRect = {
			top: imageRect.y < 0 ? 0 : imageRect.y,
			left: imageRect.x < 0 ? 0 : imageRect.x,
			width: croppedArea.width,
			height: croppedArea.height
		};
	}

	async createCanvas() {
		const inputImagePath = path.join(process.cwd(), this.inputImagePath);
		this.getCroppedArea();
		this.getCompositeRect();
		const imageBuffer = await sharp(inputImagePath).resize(this.imageRect.width, this.imageRect.height).extract(this.croppedArea).toBuffer();
		const canvasBuffer = await sharp({
			create: { width: this.resultCanvasSize.width, height: this.resultCanvasSize.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
		})
			.composite([{ input: imageBuffer, ...this.compositeRect }])
			.jpeg()
			.toBuffer();
		fs.writeFile(path.join(process.cwd(), "preview.jpg"), canvasBuffer);
		this.canvasBuffer = canvasBuffer;
	}

	async process() {
		this.getResultImageSize();
		this.getImageRect();
		await this.createCanvas();
		await this.createMask();

		const request = {
			instances: [
				{
					prompt: this.textPrompt,
					referenceImages: [
						{
							referenceType: "REFERENCE_TYPE_RAW",
							referenceId: 1,
							referenceImage: {
								bytesBase64Encoded: this.canvasBuffer.toString("base64")
							}
						},
						{
							referenceType: "REFERENCE_TYPE_MASK",
							referenceId: 2,
							referenceImage: {
								bytesBase64Encoded: this.maskBuffer.toString("base64")
							},
							maskImageConfig: {
								maskMode: "MASK_MODE_USER_PROVIDED",
								dilation: 0.03
							}
						}
					],
					outputOptions: {
						mimeType: "image/jpeg"
					}
				}
			],
			parameters: {
				baseStep: 75,
				sampleCount: `${this.imageCount}`,
				editMode: `${this.editMode}`,
				editConfig: {
					outpaintingConfig: {
						blendingMode: "alpha-blending",
						blendingFactor: 0.01
					}
				}
			}
		};

		const accessToken = this.getAccessToken();
		const response = await fetch(this.HTTP_METHOD_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(request)
		});

		const data = await response.json();

		if (!data?.predictions) {
			console.log("No predictions");
			return;
		}

		const paths = await Promise.all(
			data.predictions.map(async (prediction, index) => {
				const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
				const savePath = process.env.NODE_ENV === "development" ? "public/generations" : "generations";
				const uploadDir = path.join(process.cwd(), savePath);
				await fs.mkdir(uploadDir, { recursive: true });
				const fileName = crypto.randomUUID() + ".jpg";
				const filePath = path.join(uploadDir, fileName);
				await fs.writeFile(filePath, imageBuffer);
				return `/generations/${fileName}`;
			})
		);
		return paths;
	}
}

export async function POST(req) {
	const { src, transform } = await req.json();
	const outpainter = new ImageOutpainter({
		inputImagePath: process.env.NODE_ENV === "development" ? `/public/${src}` : src,
		transform
	});
	const paths = await outpainter.process();
	if (!paths) {
		return NextResponse.json({ data: [] }, { status: 500 });
	}
	return NextResponse.json({ data: paths }, { status: 200 });
}
