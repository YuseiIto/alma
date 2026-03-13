import type { Context } from "grammy";
import { Bot } from "grammy";
import { z } from "zod";
import type { ChatConfig, ChatMessage, ChatResponse } from "./chat-agent";
import { getConfig } from "./config";

const TextMessageContextSchema = z.object({
	chat: z.object({
		id: z.number(),
	}),
	message: z.object({
		message_id: z.number(),
		date: z.number(),
		text: z.string(),
	}),
});

const thread: ChatMessage[] = [];

const onTextMessage = async (chatHandler: ChatHandler, ctx: Context) => {
	const input = TextMessageContextSchema.parse(ctx);

	// const chatId = ctx.chat.id;
	// const messageId = ctx.message.message_id;
	// const date = ctx.message.date;
	const text = input.message.text;

	thread.push({
		role: "user",
		content: text,
	});

	const response = await chatHandler(thread, {
		remember: true,
		model: "qwen3.5-35b-a3b",
	});

	thread.push({
		role: "assistant",
		content: response.content,
	});

	ctx.reply(response.content);
};

type ChatHandler = (
	message: ChatMessage[],
	config: ChatConfig,
) => Promise<ChatResponse>;

export const initTelegramBot = (chatHandler: ChatHandler): Bot => {
	const config = getConfig();
	const bot = new Bot(config.telegramBotToken);

	bot.on("message:text", (ctx) => {
		onTextMessage(chatHandler, ctx);
	});
	return bot;
};
