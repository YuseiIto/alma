import type { Message as Mem0Message } from "mem0ai/oss";
import type OpenAI from "openai";

export type Message = OpenAI.ChatCompletionMessageParam;

const stringifyContentPart = (
	part: OpenAI.ChatCompletionContentPart,
): string => {
	if ("text" in part) {
		return part.text;
	}
	return "";
};

export const stringifyMessageContent = (
	content: OpenAI.ChatCompletionContentPart[] | string,
): string => {
	if (typeof content === "string") {
		return content;
	} else {
		return content.map(stringifyContentPart).join("");
	}
};

const toMem0Message = (message: Message): Mem0Message | null => {
	if (
		["tool", "function", "system"].includes(message.role) ||
		message.content === undefined ||
		message.content === null
	) {
		return null;
	}

	/* NOTE: Cast is safe: the type error is a library-level conflict between
	 * ChatCompletionContentPartRefusal and the global File type, not a runtime issue.
	 * stringifyContentPart already handles non-text parts gracefully via "text" in part.
	 */
	return {
		role: message.role,
		content: stringifyMessageContent(
			message.content as string | OpenAI.ChatCompletionContentPart[],
		),
	};
};

const toMem0Messages = (messages: Message[]): Mem0Message[] =>
	messages.map(toMem0Message).filter((msg) => msg !== null);

export class Conversation {
	private systemPrompt: string;
	private history: Message[] = [];

	constructor(systemPrompt: string) {
		this.systemPrompt = systemPrompt;
	}

	buildMessages(userInput: string): Message[] {
		return [
			{ role: "system", content: this.systemPrompt },
			...this.history,
			{ role: "user", content: userInput },
		];
	}

	addTurn(userInput: string, assistantReply: Message): void {
		this.history.push({ role: "user", content: userInput });
		this.history.push(assistantReply);
	}

	add(toolResult: Message): void {
		this.history.push(toolResult);
	}

	getHistoryForMem0(): Mem0Message[] {
		return toMem0Messages(this.history);
	}
}
