import { z } from "zod";
import { logger } from "./logger";

const ConfigSchema = z.object({
	litellmApiBase: z.url(),
	litellmApiKey: z.string().startsWith("sk-"),
});

export type Config = z.infer<typeof ConfigSchema>;

export const getConfig = (): Config => {
	const litellmApiBase = process.env.LITELLM_API_BASE;
	const litellmApiKey = process.env.LITELLM_API_KEY;

	const result = ConfigSchema.safeParse({
		litellmApiBase,
		litellmApiKey,
	});

	if (!result.success) {
		logger.error("Invalid configuration:", result.error);
		throw new Error("Invalid configuration");
	}

	return result.data;
};
