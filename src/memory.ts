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
