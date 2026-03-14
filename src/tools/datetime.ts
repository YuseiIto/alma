import type { Tool } from "./tool";

export const getCurrentTimeTool: Tool = {
	definition: {
		type: "function",
		function: {
			name: "get_current_time",
			description: "Get the current time in JST (UTC+9).",
			parameters: {
				type: "object",
				properties: {},
				required: [],
			},
		},
	},
	execute: () => {
		return `${new Date()
			.toLocaleString("sv-SE", {
				timeZone: "Asia/Tokyo",
				hour12: false,
			})
			.replace(" ", "T")}+09:00 (JST)`;
	},
};
