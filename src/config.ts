import { z } from "zod";
import { logger } from "./logger";

const ConfigSchema = z.object({
	litellm_api_base: z.url(),
	litellm_api_key: z.string().startsWith("sk-"),
});

export type Config = z.infer<typeof ConfigSchema>;

export const get_config = (): Config => {
	logger.debug("Checking configuration...");
	const litellm_api_base = process.env.LITELLM_API_BASE;
	const litellm_api_key = process.env.LITELLM_API_KEY;

	const result = ConfigSchema.parse({
		litellm_api_base,
		litellm_api_key,
	});

	logger.success("Configuration is valid.");
	return result;
};
