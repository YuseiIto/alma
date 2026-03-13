import type { Message } from "mem0ai/oss";
import { Memory } from "mem0ai/oss";
import type { OpenAI } from "openai";
import type { Message as ChatMessage } from "./chat-agent";
import { getConfig } from "./config";

const config = getConfig();

export const memory = new Memory({
	version: "v1.1",
	llm: {
		provider: "openai",
		config: {
			model: "openrouter/openrouter/hunter-alpha",
			apiKey: config.litellmApiKey,
			baseURL: config.litellmApiBase,
		},
	},
	vectorStore: {
		provider: "memory",
		config: {
			collectionName: "memories",
			dimension: 256,
		},
	},
	embedder: {
		provider: "openai",
		config: {
			model: "ollama/bge-m3",
			apiKey: config.litellmApiKey,
			url: config.litellmApiBase,
			embeddingDims: 256,
		},
	},
});

const stringifyContentPart = (
	part: OpenAI.ChatCompletionContentPart,
): string => {
	if ("text" in part) {
		return part.text;
	}
	return "";
};

const stringifyMessageContent = (
	content: OpenAI.ChatCompletionContentPart[] | string,
): string => {
	if (typeof content === "string") {
		return content;
	} else {
		return content.map(stringifyContentPart).join("");
	}
};

export const toMem0Message = (message: ChatMessage): Message | null => {
	if (
		["tool", "function", "system"].includes(message.role) ||
		message.content === undefined ||
		message.content === null
	) {
		return null;
	}

	return {
		role: message.role,
		/* NOTE: Cast is safe: the type error is a library-level conflict between
		 * ChatCompletionContentPartRefusal and the global File type, not a runtime issue.
		 * stringifyContentPart already handles non-text parts gracefully via "text" in part.
		 */
		content: stringifyMessageContent(
			message.content as string | OpenAI.ChatCompletionContentPart[],
		),
	};
};

export const toMem0Messages = (messages: ChatMessage[]): Message[] =>
	messages.map(toMem0Message).filter((msg) => msg !== null);
