import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(req) {
	try {
		const formData = await req.formData();
		const file = formData.get("file");

		if (!file) {
			return new Response(JSON.stringify({ error: "No file uploaded" }), {
				status: 400
			});
		}

		// Достаём байты файла
		const buffer = Buffer.from(await file.arrayBuffer());

		// Путь куда сохраняем
		const uploadDir = path.join(process.cwd(), "public", "uploads");
		await mkdir(uploadDir, { recursive: true });
		const filePath = path.join(uploadDir, file.name);

		// Сохраняем файл
		await writeFile(filePath, buffer);

		// Возвращаем ссылку (Next автоматически отдаёт из public/)
		return new Response(JSON.stringify({ url: `/uploads/${file.name}` }), { status: 200 });
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ error: "Upload failed" }), {
			status: 500
		});
	}
}
