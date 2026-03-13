import type { Context } from "grammy";
import { Bot } from "grammy";
import { z } from "zod";
import type { ChatConfig } from "./chat-agent";
import { getConfig } from "./config";
import { Conversation } from "./conversation";

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

const conversations = new Map<number, Conversation>();

const onTextMessage = async (chatHandler: ChatHandler, ctx: Context) => {
	const input = TextMessageContextSchema.parse(ctx);

	const chatId = input.chat.id;
	const text = input.message.text;

	let conversation = conversations.get(chatId);
	if (!conversation) {
		conversation = new Conversation("You are a helpful assistant.");
		conversations.set(chatId, conversation);
	}

	const response = await chatHandler(text, conversation, {
		remember: true,
		model: "qwen3.5-35b-a3b",
	});
	ctx.reply(response);
};

type ChatHandler = (
	userInput: string,
	conversation: Conversation,
	config: ChatConfig,
) => Promise<string>;

export const initTelegramBot = (chatHandler: ChatHandler): Bot => {
	const config = getConfig();
	const bot = new Bot(config.telegramBotToken);

	bot.on("message:text", (ctx) => {
		onTextMessage(chatHandler, ctx);
	});
	return bot;
};
