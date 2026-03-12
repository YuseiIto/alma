import OpenAI from "openai";
import { get_config } from "./config";

console.log("Checking configuration...");
const config = get_config();

console.log("Starting OpenAI client...");

const client = new OpenAI({
	baseURL: config.litellm_api_base,
	apiKey: config.litellm_api_key,
});

console.log("Sending test request...");

const response = await client.chat.completions.create({
	model: "qwen3.5-35b-a3b",
	messages: [
		{
			role: "user",
			content: "Hello, world!",
		},
	],
});

console.log("Response:");
console.log(response.choices[0].message.content);
