import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getVideoTranslateS3 } from "@/lib/videoTranslate";

/** Keys the app may serve via this proxy (private bucket, same credentials as video translate). */
const ALLOWED_PREFIX = "app/uploads/";

function isAllowedKey(key) {
	return (
		typeof key === "string" &&
		key.length > 0 &&
		key.length < 2048 &&
		!key.includes("..") &&
		key.startsWith(ALLOWED_PREFIX)
	);
}

export async function GET(request) {
	const key = request.nextUrl.searchParams.get("key");
	if (!isAllowedKey(key)) {
		return new Response("Invalid key", { status: 400 });
	}
	try {
		const { client, bucket } = getVideoTranslateS3();
		const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
		const contentType = out.ContentType || "application/octet-stream";
		const body = out.Body;
		if (!body) {
			return new Response("Not found", { status: 404 });
		}
		const webStream =
			typeof body.transformToWebStream === "function"
				? body.transformToWebStream()
				: null;
		if (!webStream) {
			return new Response("Stream error", { status: 500 });
		}
		return new Response(webStream, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "private, max-age=300",
			},
		});
	} catch (err) {
		const code = err?.name || err?.Code;
		const status = err?.$metadata?.httpStatusCode;
		if (code === "NoSuchKey" || status === 404) {
			return new Response("Not found", { status: 404 });
		}
		console.error(err);
		return new Response("Storage error", { status: 500 });
	}
}
