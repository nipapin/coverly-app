import OpenAI from "openai";

const client = new OpenAI({
	baseURL: "https://api.studio.nebius.com/v1/",
	apiKey: process.env.NEBIUS_API_KEY
});

client.images
	.generate({
		model: "black-forest-labs/flux-dev",
		response_format: "b64_json",
		response_extension: "png",
		width: 1024,
		height: 1024,
		num_inference_steps: 28,
		negative_prompt: "",
		seed: -1,
		loras: null,
		prompt: "YOUR_PROMPT"
	})
	.then((response) => console.log(response));

// const client = new OpenAI({
// 	baseURL: "https://api.studio.nebius.com/v1/",
// 	apiKey: process.env.NEBIUS_API_KEY
// });

client.images
	.generate({
		model: "black-forest-labs/flux-schnell",
		response_format: "b64_json",
		response_extension: "png",
		width: 1024,
		height: 1024,
		num_inference_steps: 4,
		negative_prompt: "",
		seed: -1,
		loras: null,
		prompt: "YOUR_PROMPT"
	})
	.then((response) => console.log(response));
