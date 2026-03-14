// Some reasoning models (e.g. DeepSeek-R1) output <think>...</think> for CoT.
// Proxies like LiteLLM may strip the block but leave the closing </think> tag in content.
export const sanitizeContent = (content: string): string =>
	content
		.replace(/<think>[\s\S]*?<\/think>/g, "")
		.replace(/<\/think>/g, "")
		.trimStart();
