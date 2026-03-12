import OpenAI from "openai";
import { get_config } from "./config";
import { logger } from "./logger";

const config = get_config();

logger.debug("Starting OpenAI client...");

const client = new OpenAI({
	baseURL: config.litellm_api_base,
	apiKey: config.litellm_api_key,
});

logger.success("OpenAI client initialized.");

logger.start("Sending test request...");

const response = await client.chat.completions.create({
	model: "qwen3.5-35b-a3b",
	messages: [
		{
			role: "user",
			content: "Hello, world!",
		},
	],
});

logger.ready(`Response:${response.choices[0].message.content}`);
