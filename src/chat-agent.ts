import OpenAI from "openai";
import { getConfig } from "./config";
import { logger } from "./logger";
import { memory } from "./memory";

const config = getConfig();

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface ChatConfig {
	remember?: boolean;
}

export interface ChatResponse {
	content: string;
	messages: ChatMessage[];
}

export const chat = async (
	messages: ChatMessage[],
	chatConfig: ChatConfig,
): Promise<ChatResponse> => {
	logger.debug("Starting OpenAI client...");
	const client = new OpenAI({
		baseURL: config.litellmApiBase,
		apiKey: config.litellmApiKey,
	});

	logger.success("OpenAI client initialized.");

	const response = await client.chat.completions.create({
		model: "qwen3.5-35b-a3b",
		messages: messages,
	});

	const responseContent = response.choices?.[0]?.message.content?.trim() ?? "";

	const msgs: ChatMessage[] = [
		...messages,
		{
			role: "assistant",
			content: responseContent,
		},
	];

	if (chatConfig.remember) {
		await memory.add(msgs, { userId: "yuseiito", metadata: {} });
	}

	return {
		content: responseContent,
		messages: msgs,
	};
};
