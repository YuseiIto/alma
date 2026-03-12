import OpenAI from "openai";
import { getConfig } from "./config";
import { logger } from "./logger";
import { memory } from "./memory";

const config = getConfig();
logger.debug("Starting OpenAI client...");

const client = new OpenAI({
	baseURL: config.litellmApiBase,
	apiKey: config.litellmApiKey,
});

logger.success("OpenAI client initialized.");

logger.start("Sending test request...");

const messages = [
	{
		role: "system",
		content: "You are a helpful assistant.",
	},
	{
		role: "user",
		content: "Hello, world!",
	},
];

const response = await client.chat.completions.create({
	model: "qwen3.5-35b-a3b",
	messages: messages,
});

const responseContent = response.choices[0].message.content;
logger.ready(`Response:${responseContent}`);

messages.push({
	role: "assistant",
	content: responseContent,
});

await memory.add(messages, { userId: "yuseiito", metadata: {} });
