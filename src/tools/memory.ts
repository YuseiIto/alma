import { memory } from "../memory";
import type { Tool } from "./tool";

export const searchMemoryTool: Tool = {
	definition: {
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
	execute: async (input: string) => {
		const { query } = JSON.parse(input) as { query: string };
		const results = await memory.search(query, { userId: "yuseiito" });
		return JSON.stringify(results);
	},
};

export const addMemoryTool: Tool = {
	definition: {
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
	execute: async (input: string) => {
		const { content } = JSON.parse(input) as { content: string };
		await memory.add([{ role: "user", content }], {
			userId: "yuseiito",
			metadata: {},
		});
		return "Memory saved.";
	},
};
