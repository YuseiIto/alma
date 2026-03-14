import { Memory } from "mem0ai/oss";
import { getConfig } from "./config";
import { sanitizeContent } from "./sanitize";

const config = getConfig();

export const memory = new Memory({
	version: "v1.1",
	llm: {
		provider: "openai",
		config: {
			model: "openrouter/openai/gpt-4o-nano",
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

// Reasoning models (e.g. DeepSeek-R1) may prefix JSON responses with <think>...</think>,
// which breaks mem0's schema parsing and prevents fact extraction.
// Monkey-patch the internal LLM to sanitize responses before mem0 processes them.
// biome-ignore lint/suspicious/noExplicitAny: mem0 internal LLM is not typed
const llm = (memory as any).llm;

const origGenerateResponse = llm.generateResponse.bind(llm);
llm.generateResponse = async (
	...args: Parameters<typeof origGenerateResponse>
) => {
	const result = await origGenerateResponse(...args);
	if (typeof result === "string") return sanitizeContent(result);
	if (result && typeof result.content === "string") {
		return { ...result, content: sanitizeContent(result.content) };
	}
	return result;
};

const origGenerateChat = llm.generateChat.bind(llm);
llm.generateChat = async (...args: Parameters<typeof origGenerateChat>) => {
	const result = await origGenerateChat(...args);
	if (result && typeof result.content === "string") {
		return { ...result, content: sanitizeContent(result.content) };
	}
	return result;
};
