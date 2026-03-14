import type { Tool } from "./tool";

export const getCurrentTimeTool: Tool = {
	definition: {
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
	execute: () => {
		return new Date().toISOString();
	},
};
