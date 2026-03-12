import { Memory } from "mem0ai/oss";
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
	embedder: {
		provider: "openai",
		config: {
			model: "lm_studio/text-embedding-bge-m3",
			apiKey: config.litellmApiKey,
			baseURL: config.litellmApiBase,
		},
	},
});
