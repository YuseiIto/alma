import OpenAI from "openai";
import { getConfig } from "./config";
import type { Conversation, Message } from "./conversation";
import { stringifyMessageContent } from "./conversation";
import { logger } from "./logger";
import { memory } from "./memory";
import { sanitizeContent } from "./sanitize";
import { toolRegistry } from "./tools";

const config = getConfig();
logger.debug("Starting OpenAI client...");
const client = new OpenAI({
	baseURL: config.litellmApiBase,
	apiKey: config.litellmApiKey,
});

logger.success("OpenAI client initialized.");

export interface ChatConfig {
	model: string;
	remember?: boolean;
}

const toText = (msg: Message): string =>
	sanitizeContent(
		stringifyMessageContent(
			(msg.content ?? "") as string | OpenAI.ChatCompletionContentPart[],
		),
	);

export const chat = async (
	userInput: string,
	conversation: Conversation,
	chatConfig: ChatConfig,
): Promise<string> => {
	while (true) {
		logger.start("Sending request to the model...");
		const response = await client.chat.completions.create({
			model: chatConfig.model,
			messages: conversation.buildMessages(userInput),
			tools: toolRegistry.toolDefinitions(),
			max_tokens: 6000,
		});
		logger.ready("Received response from the model.");

		const choice = response.choices?.[0];
		if (!choice) {
			throw new Error("No response from the model");
		}

		if (choice.finish_reason === "length") {
			logger.warn(
				"Response truncated due to length. Consider using a more concise prompt or a model with a larger context window.",
			);
			throw new Error("Response truncated due to length limit.");
		}
		if (choice.finish_reason === "content_filter") {
			logger.warn(
				"Response was filtered by content filter. Consider adjusting your prompt or checking the content guidelines.",
			);
			throw new Error("Response filtered by content policy.");
		}
		if (choice.finish_reason === "function_call") {
			logger.fatal(
				"function_call is not expected to be returned since we are not giving any functions in the request.",
			);
			throw new Error("Unexpected function_call finish reason.");
		}

		if (choice.finish_reason === "tool_calls") {
			const text = toText(choice.message);
			conversation.addTurn(userInput, { ...choice.message, content: text });

			for (const toolCall of choice.message.tool_calls ?? []) {
				if (toolCall.type !== "function") {
					throw new Error(`Unsupported tool call type: ${toolCall.type}`);
				}
				const result = await toolRegistry.execute(
					toolCall.function.name,
					toolCall.function.arguments,
				);

				conversation.add({
					role: "tool",
					tool_call_id: toolCall.id,
					content: result,
				});
			}
		} else if (choice.finish_reason === "stop") {
			const text = toText(choice.message);
			conversation.addTurn(userInput, { ...choice.message, content: text });
			if (chatConfig.remember) {
				// Fire-and-forget: don't block the response on memory operations
				memory
					.add(conversation.getHistoryForMem0(), {
						userId: "yuseiito",
						metadata: {},
					})
					.catch((err) => logger.error("Memory add failed:", err));
			}
			return text;
		}
	}
};
