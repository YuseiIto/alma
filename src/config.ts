import { z } from "zod";
import { logger } from "./logger";

const ConfigSchema = z.object({
	litellmApiBase: z.url(),
	litellmApiKey: z.string().startsWith("sk-"),
	telegramBotToken: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const getConfig = (): Config => {
	const litellmApiBase = process.env.LITELLM_API_BASE;
	const litellmApiKey = process.env.LITELLM_API_KEY;
	const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

	// NOTE: Setting LITELLM_API_BASE as OPENAI_BASE_URL since mem0-ts ignores url param at the time of implentation.
	// Refer to https://github.com/mem0ai/mem0/pull/4275
	if (litellmApiBase) {
		process.env.OPENAI_BASE_URL = litellmApiBase;
	}

	const result = ConfigSchema.safeParse({
		litellmApiBase,
		litellmApiKey,
		telegramBotToken,
	});

	if (!result.success) {
		logger.error("Invalid configuration:", result.error);
		throw new Error("Invalid configuration");
	}

	return result.data;
};
