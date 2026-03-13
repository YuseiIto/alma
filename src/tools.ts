import type { OpenAI } from "openai";
import { memory } from "./memory";

type ToolResult = OpenAI.ChatCompletionContentPartText[] | string;

export const tools: OpenAI.ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "get_current_time",
			description: "Get the current time.",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "search_memory",
			description:
				"Search stored memories by query. Use this to acquire user's background and previous interactions.",
			parameters: {
				type: "object",
				properties: {
					query: { type: "string", description: "Search query" },
				},
				required: ["query"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "add_memory",
			description:
				"Save a piece of information to memory. Use this to remember important information about the user or the context that might be useful in the future.",
			parameters: {
				type: "object",
				properties: {
					content: { type: "string", description: "Content to remember" },
				},
				required: ["content"],
			},
		},
	},
];

export const dispatchTool = async (
	toolName: string,
	input: string,
): Promise<ToolResult> => {
	switch (toolName) {
		case "get_current_time":
			return new Date().toISOString();
		case "search_memory": {
			const { query } = JSON.parse(input) as { query: string };
			const results = await memory.search(query, { userId: "yuseiito" });
			return JSON.stringify(results);
		}
		case "add_memory": {
			const { content } = JSON.parse(input) as { content: string };
			await memory.add([{ role: "user", content }], {
				userId: "yuseiito",
				metadata: {},
			});
			return "Memory saved.";
		}
	}

	throw new Error(`Unknown tool: ${toolName}`);
};
