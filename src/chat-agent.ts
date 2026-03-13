import OpenAI from "openai";
import { getConfig } from "./config";
import { logger } from "./logger";
import { memory, toMem0Messages } from "./memory";
import { dispatchTool, tools } from "./tools";

const config = getConfig();
export type Message = OpenAI.ChatCompletionMessageParam;

export interface ChatConfig {
	model: string;
	remember?: boolean;
}

export interface ChatResponse {
	content: string;
	messages: Message[];
}

export const start_chat = async (): Promise<ChatResponse> => {
	const initialMessage: Message = {
		role: "system",
		content: "You are a helpful assistant.",
	};

	return {
		content: "",
		messages: [initialMessage],
	};
};

export const chat = async (
	messages: Message[],
	chatConfig: ChatConfig,
): Promise<ChatResponse> => {
	logger.debug("Starting OpenAI client...");
	const client = new OpenAI({
		baseURL: config.litellmApiBase,
		apiKey: config.litellmApiKey,
	});

	logger.success("OpenAI client initialized.");

	const msgs: Message[] = [...messages];

	while (true) {
		logger.start("Sending request to the model...");
		const response = await client.chat.completions.create({
			model: chatConfig.model,
			messages: msgs,
			tools,
		});
		logger.ready("Received response from the model.");

		const choice = response.choices?.[0];
		if (!choice) {
			throw new Error("No response from the model");
		}

		if (choice.finish_reason === "stop") {
			msgs.push(choice.message);
			break;
		} else if (choice.finish_reason === "length") {
			const role = choice.message.role;
			const content = `${choice.message?.content ?? ""} (Omitted)`;
			msgs.push({ role, content });
			logger.warn(
				"Response truncated due to length. Consider using a more concise prompt or a model with a larger context window.",
			);
			break;
		} else if (choice.finish_reason === "content_filter") {
			logger.warn(
				"Response was filtered by content filter. Consider adjusting your prompt or checking the content guidelines.",
			);
			break;
		} else if (choice.finish_reason === "function_call") {
			logger.fatal(
				"funcion_call is not expected to be returned since we are not giving any functions in the request.",
			);
			msgs.push({
				role: "assistant",
				content: "Error: function_call finish reason is not supported.",
			});
			break;
		} else if (choice.finish_reason === "tool_calls") {
			msgs.push(choice.message);

			for (const toolCall of choice.message.tool_calls ?? []) {
				if (toolCall.type === "function") {
					const toolName = toolCall.function.name;
					logger.start(`Calling tool ${toolName}`);
					const result = await dispatchTool(
						toolCall.function.name,
						toolCall.function.arguments,
					);

					logger.ready(`Tool ${toolName} returned result: ${result}`);

					msgs.push({
						role: "tool",
						tool_call_id: toolCall.id,
						content: result,
					});
				} else if (toolCall.type === "custom") {
					logger.fatal(
						"Custom tool calls are not supported in this implementation.",
					);
					msgs.push({
						role: "assistant",
						content: "Error: custom tool calls are not supported.",
					});
					break;
				}
			}
		}
	}

	const lastContent = msgs[msgs.length - 1]?.content ?? "";
	const responseContent =
		typeof lastContent === "string"
			? lastContent
			: Array.isArray(lastContent)
				? lastContent
						.map((p) => ("text" in p ? (p as { text: string }).text : ""))
						.join("")
				: "";

	if (chatConfig.remember) {
		await memory.add(toMem0Messages(msgs), {
			userId: "yuseiito",
			metadata: {},
		});
	}

	return {
		content: responseContent,
		messages: msgs,
	};
};
